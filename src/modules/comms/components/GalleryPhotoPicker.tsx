// src/modules/comms/components/GalleryPhotoPicker.tsx
// Wybór zdjęć z galerii studia do odpowiedzi mailowej.
//
// Najczęstszy załącznik w rozmowie z klientem to zdjęcie JEGO auta: „tak wyglądał
// lakier po korekcie", „to ta rysa". Do tej pory trzeba było je ściągnąć z galerii
// na dysk i wgrać spinaczem - na telefonie praktycznie niewykonalne. Tu wybiera się
// je kliknięciem, a pliki dokłada serwer (GalleryPhotoAttachmentLoader), więc nic
// nie przechodzi przez urządzenie pracownika.
//
// Zakres zaczyna się od najwęższego, jaki znamy: „Ten klient" (jego wizyty i auta),
// potem „To auto" (marka i model - zdjęcia tej samej realizacji na innym egzemplarzu
// to dobry przykład dla klienta, który dopiero pyta), na końcu cała galeria.
// Zakładek, dla których nie ma danych, nie pokazujemy - pusta zakładka to pytanie
// „czemu tu nic nie ma", na które użytkownik nie ma odpowiedzi.
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Check, ChevronLeft, ChevronRight, ImageOff, Monitor } from 'lucide-react';
import {
    CloseBtn,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalShell,
    ModalSubtitle,
    ModalTitle,
    ModalTitleGroup,
} from '@/common/components/ModalKit';
import { SUBMODAL_Z_INDEX } from '@/common/styles';
import { Button, Segmented, touch, ui } from '@/common/components/ui';
import { useGallery } from '@/modules/gallery/hooks/useGallery';
import type { GalleryFilters, GalleryPhoto } from '@/modules/gallery/types';
import { galleryPhotoKey } from '../utils/galleryPhotoKey';

/** Co wiemy o rozmowie - z tego biorą się zakładki zakresu. */
export interface GalleryPickerContext {
    customerId?: string | null;
    vehicleBrand?: string | null;
    vehicleModel?: string | null;
}

type Scope = 'customer' | 'vehicle' | 'all';

const PAGE_SIZE = 24;

const ScopeRow = styled.div`
    margin-bottom: 14px;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

/**
 * Siatka miniatur: tyle kolumn, ile się zmieści, nie mniej niż 110 px na zdjęcie.
 * Na telefonie wychodzą dwie-trzy kolumny, na komputerze pięć - bez osobnych progów.
 */
const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 8px;
`;

const Thumb = styled.button<{ $selected: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    .frame {
        position: relative;
        aspect-ratio: 4 / 3;
        border-radius: 10px;
        overflow: hidden;
        background: ${ui.surfaceAlt};
        outline: ${p => (p.$selected ? `3px solid ${ui.brand}` : `1px solid ${ui.line}`)};
        outline-offset: ${p => (p.$selected ? '-3px' : '-1px')};
    }
    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        opacity: ${p => (p.$selected ? 0.85 : 1)};
        transition: opacity 120ms ease;
    }
    .mark {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        background: ${p => (p.$selected ? ui.brand : 'rgba(15, 23, 42, 0.28)')};
        color: #ffffff;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.3);
    }
    .caption {
        font-size: 11.5px;
        line-height: 1.3;
        color: ${ui.textMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &:hover .frame { outline-color: ${p => (p.$selected ? ui.brand : ui.lineStrong)}; }
    &:focus-visible { outline: none; }
    &:focus-visible .frame { outline: 3px solid ${ui.focusRing}; outline-offset: -3px; }
`;

const Empty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 40px 16px;
    text-align: center;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const Pager = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 14px;
    font-size: 12.5px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

const FooterRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;

    .spacer { flex: 1; }
    .count { font-size: 12.5px; color: ${ui.textMuted}; }

    /* Telefon: „Z komputera" zostaje ikoną z podpisem w title, licznik spada. */
    @media (max-width: 480px) {
        .count { display: none; }
        .fromDevice span { display: none; }
    }
    ${touch} { button { min-height: 44px; } }
`;

const Skeleton = styled.div`
    aspect-ratio: 4 / 3;
    border-radius: 10px;
    background: ${ui.surfaceAlt};
`;

interface GalleryPhotoPickerProps {
    onClose: () => void;
    context?: GalleryPickerContext;
    /** Zdjęcia już dołączone - otwierają się zaznaczone, żeby dało się je też odznaczyć. */
    initialSelection: GalleryPhoto[];
    /** Ile zdjęć zmieści się jeszcze w wiadomości (limit plików liczy też pliki z dysku). */
    maxSelectable: number;
    onConfirm: (photos: GalleryPhoto[]) => void;
    /** „Z komputera" - zamyka okno i otwiera systemowy wybór pliku. */
    onPickFromDevice: () => void;
}

const photoCaption = (photo: GalleryPhoto): string =>
    [photo.vehicleBrand, photo.vehicleModel].filter(Boolean).join(' ') ||
    photo.vehicleLicensePlate ||
    photo.contractorName ||
    photo.fileName;

export function GalleryPhotoPicker({
    onClose,
    context,
    initialSelection,
    maxSelectable,
    onConfirm,
    onPickFromDevice,
}: GalleryPhotoPickerProps) {
    const scopes = useMemo(() => {
        const list: { value: Scope; label: string }[] = [];
        if (context?.customerId) list.push({ value: 'customer', label: 'Ten klient' });
        if (context?.vehicleBrand) list.push({ value: 'vehicle', label: 'To auto' });
        list.push({ value: 'all', label: 'Cała galeria' });
        return list;
    }, [context?.customerId, context?.vehicleBrand]);

    const [scope, setScope] = useState<Scope>(scopes[0].value);
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<GalleryPhoto[]>(initialSelection);

    // Inny zakres to inna lista - zaczynamy od jej pierwszej strony.
    const changeScope = (next: Scope) => {
        setScope(next);
        setPage(1);
    };

    const filters: GalleryFilters = {
        tags: [],
        brand: scope === 'vehicle' ? context?.vehicleBrand ?? '' : '',
        model: scope === 'vehicle' ? context?.vehicleModel ?? '' : '',
        customerId: scope === 'customer' ? context?.customerId ?? undefined : undefined,
        page,
        pageSize: PAGE_SIZE,
    };
    const { photos, pagination, isLoading, error } = useGallery(filters);
    const totalPages = pagination?.totalPages ?? 1;

    const selectedKeys = new Set(selected.map(galleryPhotoKey));
    const limitReached = selected.length >= maxSelectable;

    const toggle = (photo: GalleryPhoto) => {
        const key = galleryPhotoKey(photo);
        setSelected((current) =>
            current.some((item) => galleryPhotoKey(item) === key)
                ? current.filter((item) => galleryPhotoKey(item) !== key)
                : current.length >= maxSelectable
                  ? current
                  : [...current, photo]
        );
    };

    const added = selected.filter((photo) => !initialSelection.some((item) => galleryPhotoKey(item) === galleryPhotoKey(photo))).length;
    const changed = added > 0 || selected.length !== initialSelection.length;
    const confirmLabel =
        selected.length === 0
            ? 'Bez zdjęć'
            : `Dołącz ${selected.length} ${selected.length === 1 ? 'zdjęcie' : selected.length < 5 ? 'zdjęcia' : 'zdjęć'}`;

    return (
        <ModalShell isOpen onClose={onClose} size="xl" stableHeight zIndex={SUBMODAL_Z_INDEX} labelledBy="gallery-picker-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="gallery-picker-title">Zdjęcia z galerii</ModalTitle>
                    <ModalSubtitle>Kliknij zdjęcia, które mają pójść w tej wiadomości.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                {scopes.length > 1 && (
                    <ScopeRow>
                        <Segmented options={scopes} value={scope} onChange={changeScope} label="Zakres zdjęć" size="sm" />
                    </ScopeRow>
                )}

                {isLoading ? (
                    <Grid aria-busy="true">
                        {Array.from({ length: 10 }, (_, index) => <Skeleton key={index} />)}
                    </Grid>
                ) : error ? (
                    <Empty role="alert">
                        <ImageOff size={28} />
                        Nie udało się wczytać galerii. Spróbuj ponownie za chwilę.
                    </Empty>
                ) : photos.length === 0 ? (
                    <Empty>
                        <ImageOff size={28} />
                        {scope === 'customer'
                            ? 'Ten klient nie ma jeszcze zdjęć w galerii.'
                            : scope === 'vehicle'
                              ? 'Brak zdjęć aut tej marki i modelu.'
                              : 'Galeria jest pusta.'}
                    </Empty>
                ) : (
                    <Grid role="group" aria-label="Zdjęcia">
                        {photos.map((photo) => {
                            const isSelected = selectedKeys.has(galleryPhotoKey(photo));
                            return (
                                <Thumb
                                    key={galleryPhotoKey(photo)}
                                    type="button"
                                    $selected={isSelected}
                                    aria-pressed={isSelected}
                                    disabled={!isSelected && limitReached}
                                    title={photo.description || photo.fileName}
                                    onClick={() => toggle(photo)}
                                >
                                    <span className="frame">
                                        <img src={photo.thumbnailUrl} alt={photo.description || photo.fileName} loading="lazy" />
                                        <span className="mark" aria-hidden="true">{isSelected && <Check size={13} strokeWidth={3} />}</span>
                                    </span>
                                    <span className="caption">{photoCaption(photo)}</span>
                                </Thumb>
                            );
                        })}
                    </Grid>
                )}

                {totalPages > 1 && (
                    <Pager>
                        <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Poprzednia strona">
                            <ChevronLeft size={16} />
                        </Button>
                        Strona {page} z {totalPages}
                        <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Następna strona">
                            <ChevronRight size={16} />
                        </Button>
                    </Pager>
                )}
            </ModalContent>
            <ModalFooter>
                <FooterRow>
                    <Button
                        variant="outline"
                        className="fromDevice"
                        onClick={onPickFromDevice}
                        title="Dołącz plik z tego urządzenia"
                    >
                        <Monitor size={15} /> <span>Z urządzenia</span>
                    </Button>
                    <span className="spacer" />
                    {limitReached && <span className="count">Limit plików w wiadomości</span>}
                    <Button variant="primary" onClick={() => onConfirm(selected)} disabled={!changed}>
                        {confirmLabel}
                    </Button>
                </FooterRow>
            </ModalFooter>
        </ModalShell>
    );
}
