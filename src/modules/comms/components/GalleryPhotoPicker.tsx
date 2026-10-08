// src/modules/comms/components/GalleryPhotoPicker.tsx
// Wybór zdjęć z galerii studia do odpowiedzi mailowej - okienko nad kompozytorem
// (makieta „Poczta: formatowanie wysunięte i zdjęcia z galerii").
//
// Najczęstszy załącznik w rozmowie z klientem to zdjęcie JEGO auta: „tak wyglądał
// lakier po korekcie", „to ta rysa". Do tej pory trzeba było je ściągnąć z galerii
// na dysk i wgrać spinaczem - na telefonie praktycznie niewykonalne. Tu wybiera się
// je kliknięciem, a pliki dokłada serwer (GalleryPhotoAttachmentLoader), więc nic
// nie przechodzi przez urządzenie pracownika.
//
// Zakładki zaczynają od najwęższego zakresu, jaki znamy: zdjęcia tego klienta (albo
// auta tej marki i modelu, gdy klienta nie ma w kartotece), potem cała galeria
// studia. Trzecia zakładka, „Z komputera", nie jest zakresem - otwiera zwykły wybór
// pliku, bo to ta sama decyzja: skąd wziąć zdjęcie.
//
// Okienko, a nie okno modalne: rozmowa i pisana odpowiedź zostają widoczne, a wybór
// zdjęć to dopisek do odpowiedzi, nie osobne zadanie.
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Check, ImageOff, X } from 'lucide-react';
import { useGallery } from '@/modules/gallery/hooks/useGallery';
import type { GalleryFilters, GalleryPhoto } from '@/modules/gallery/types';
import { galleryPhotoKey } from '../utils/galleryPhotoKey';
import { TintBtn, ToolBtn } from '../inbox/primitives';
import { ix } from '../inbox/tokens';

/** Co wiemy o rozmowie - z tego biorą się zakładki zakresu. */
export interface GalleryPickerContext {
    customerId?: string | null;
    vehicleBrand?: string | null;
    vehicleModel?: string | null;
    /** Nazwa pierwszej zakładki, gdy wiadomo coś lepszego niż „Ten klient" (np. „Wizyta BMW X3"). */
    label?: string | null;
}

type Scope = 'customer' | 'vehicle' | 'all';

const PAGE_STEP = 12;

const Panel = styled.section`
    box-sizing: border-box;
    width: 100%;
    max-height: min(560px, 70vh);
    display: flex;
    flex-direction: column;
    padding: 16px;
    border: 1px solid ${ix.line};
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);

    .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
    }
    h3 { margin: 0; font-size: 15px; font-weight: 600; color: ${ix.ink}; }
`;

const Segs = styled.div`
    display: flex;
    gap: 2px;
    margin-bottom: 12px;
    padding: 3px;
    border-radius: 999px;
    background: ${ix.surfaceAlt};
`;

const Seg = styled.button<{ $on: boolean }>`
    flex: 1;
    min-width: 0;
    height: 32px;
    padding: 0 8px;
    border: none;
    border-radius: 999px;
    background: ${p => (p.$on ? '#ffffff' : 'transparent')};
    box-shadow: ${p => (p.$on ? '0 1px 2px rgba(15, 23, 42, 0.1)' : 'none')};
    color: ${p => (p.$on ? ix.ink : ix.text2)};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => (p.$on ? 600 : 500)};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;

    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
`;

const Scroll = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
`;

const Photo = styled.button<{ $on: boolean }>`
    position: relative;
    display: block;
    aspect-ratio: 4 / 3;
    padding: 0;
    overflow: hidden;
    border: 2px solid ${p => (p.$on ? ix.accent : 'transparent')};
    border-radius: 10px;
    background: linear-gradient(135deg, #cbd5e1, #94a3b8);
    cursor: pointer;

    img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .check {
        position: absolute;
        top: 6px;
        right: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        background: #ffffff;
        color: ${ix.accentInk};
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
    }
    &:disabled { opacity: 0.45; cursor: default; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
`;

const Skeleton = styled.div`
    aspect-ratio: 4 / 3;
    border-radius: 10px;
    background: ${ix.surfaceAlt};
`;

const Empty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 28px 12px;
    text-align: center;
    font-size: 13.5px;
    color: ${ix.muted};
`;

const More = styled.button`
    display: block;
    margin: 10px auto 0;
    padding: 6px 14px;
    border: 1px solid ${ix.line};
    border-radius: 999px;
    background: #ffffff;
    color: ${ix.inkSoft};
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
`;

interface GalleryPhotoPickerProps {
    onClose: () => void;
    context?: GalleryPickerContext;
    /** Zdjęcia już dołączone - otwierają się zaznaczone, żeby dało się je też odznaczyć. */
    initialSelection: GalleryPhoto[];
    /** Ile zdjęć zmieści się jeszcze w wiadomości (limit plików liczy też pliki z dysku). */
    maxSelectable: number;
    onConfirm: (photos: GalleryPhoto[]) => void;
    /** „Z komputera" - zamyka okienko i otwiera systemowy wybór pliku. */
    onPickFromDevice: () => void;
}

const photoWord = (n: number): string =>
    n === 1 ? 'zdjęcie' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'zdjęcia' : 'zdjęć';

export function GalleryPhotoPicker({
    onClose,
    context,
    initialSelection,
    maxSelectable,
    onConfirm,
    onPickFromDevice,
}: GalleryPhotoPickerProps) {
    const vehicleLabel = [context?.vehicleBrand, context?.vehicleModel].filter(Boolean).join(' ');
    const scopes: { value: Scope; label: string }[] = [];
    if (context?.customerId) scopes.push({ value: 'customer', label: context.label ?? (vehicleLabel ? `Wizyty ${vehicleLabel}` : 'Ten klient') });
    else if (context?.vehicleBrand) scopes.push({ value: 'vehicle', label: vehicleLabel });
    scopes.push({ value: 'all', label: 'Galeria studia' });

    const [scope, setScope] = useState<Scope>(scopes[0].value);
    const [pageSize, setPageSize] = useState(PAGE_STEP);
    const [selected, setSelected] = useState<GalleryPhoto[]>(initialSelection);
    const panelRef = useRef<HTMLElement>(null);

    // Escape i kliknięcie obok zamykają okienko - jak każde menu, a nie jak okno modalne.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose();
            }
        };
        const onDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (panelRef.current?.contains(target)) return;
            // Przycisk, który otworzył okienko, sam je przełącza.
            if (target.closest('[aria-label="Dodaj zdjęcie z galerii"]')) return;
            onClose();
        };
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('mousedown', onDown);
        return () => {
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('mousedown', onDown);
        };
    }, [onClose]);

    const changeScope = (next: Scope) => {
        setScope(next);
        setPageSize(PAGE_STEP);
    };

    const filters: GalleryFilters = {
        tags: [],
        brand: scope === 'vehicle' ? context?.vehicleBrand ?? '' : '',
        model: scope === 'vehicle' ? context?.vehicleModel ?? '' : '',
        customerId: scope === 'customer' ? context?.customerId ?? undefined : undefined,
        page: 1,
        pageSize,
    };
    const { photos, pagination, isLoading, error } = useGallery(filters);
    const total = pagination?.total ?? photos.length;

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

    const changed =
        selected.length !== initialSelection.length ||
        selected.some((photo) => !initialSelection.some((item) => galleryPhotoKey(item) === galleryPhotoKey(photo)));

    return (
        <Panel ref={panelRef} role="dialog" aria-labelledby="gallery-picker-title">
            <div className="head">
                <h3 id="gallery-picker-title">Dodaj zdjęcia</h3>
                <ToolBtn aria-label="Zamknij" onClick={onClose}><X /></ToolBtn>
            </div>
            <Segs role="tablist" aria-label="Skąd zdjęcia">
                {scopes.map((option) => (
                    <Seg
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={scope === option.value}
                        $on={scope === option.value}
                        title={option.label}
                        onClick={() => changeScope(option.value)}
                    >
                        {option.label}
                    </Seg>
                ))}
                <Seg type="button" role="tab" aria-selected={false} $on={false} onClick={onPickFromDevice}>
                    Z komputera
                </Seg>
            </Segs>

            <Scroll>
                {isLoading ? (
                    <Grid aria-busy="true">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} />)}</Grid>
                ) : error ? (
                    <Empty role="alert"><ImageOff size={26} />Nie udało się wczytać galerii. Spróbuj ponownie za chwilę.</Empty>
                ) : photos.length === 0 ? (
                    <Empty>
                        <ImageOff size={26} />
                        {scope === 'all' ? 'Galeria studia jest pusta.' : 'Tu nie ma jeszcze zdjęć - zajrzyj do galerii studia.'}
                    </Empty>
                ) : (
                    <Grid role="group" aria-label="Zdjęcia">
                        {photos.map((photo, index) => {
                            const on = selectedKeys.has(galleryPhotoKey(photo));
                            const name = photo.description || photo.fileName || `Zdjęcie ${index + 1}`;
                            return (
                                <Photo
                                    key={galleryPhotoKey(photo)}
                                    type="button"
                                    $on={on}
                                    aria-pressed={on}
                                    aria-label={on ? `${name}, wybrane` : name}
                                    title={name}
                                    disabled={!on && limitReached}
                                    onClick={() => toggle(photo)}
                                >
                                    <img src={photo.thumbnailUrl} alt="" loading="lazy" />
                                    {on && <span className="check" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>}
                                </Photo>
                            );
                        })}
                    </Grid>
                )}
                {photos.length < total && (
                    <More type="button" onClick={() => setPageSize((size) => size + PAGE_STEP)}>Pokaż więcej</More>
                )}
            </Scroll>

            <TintBtn
                $block
                $h={44}
                style={{ marginTop: 14 }}
                disabled={!changed}
                onClick={() => onConfirm(selected)}
            >
                {selected.length === 0
                    ? initialSelection.length > 0 ? 'Usuń zdjęcia z wiadomości' : 'Wybierz zdjęcia'
                    : `Dodaj ${selected.length} ${photoWord(selected.length)}`}
            </TintBtn>
            {limitReached && (
                <span style={{ marginTop: 8, fontSize: 12, color: ix.muted, textAlign: 'center' }}>
                    Więcej plików nie zmieści się w jednej wiadomości.
                </span>
            )}
        </Panel>
    );
}
