import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Award, ChevronDown, Droplets, FileDown, Package, Plus, Search, Wrench, X } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { Button, ui } from '@/common/components/ui';
import { InputShell, BareInput } from '@/common/components/Form';
import { useDebounce } from '@/common/hooks/useDebounce';
import { useToast } from '@/common/components/Toast/ToastContainer';
import { usePermissions } from '@/core/permissions';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useProducts, useVisitProducts } from '@/modules/products/hooks/useProducts';
import { useCareInstructions } from '@/modules/settings/hooks/useCareInstructions';
import { qualityCertificateApi, type CertificateProductEntry } from '../api/qualityCertificateApi';
import type { Visit } from '../types';

// Okno „Certyfikat jakości".
//
// Certyfikat NIE jest odbiciem wizyty: kontekst biznesowy jest taki, że nie każda
// wykonana usługa i nie każdy zużyty preparat mają trafić do dokumentu dla klienta,
// a zalecenia nie wynikają z danych wizyty w ogóle — wpisuje je człowiek. Dlatego okno
// pozwala o wszystkim zdecydować i niczego nie domyśla się po zapisaniu.
//
// Zaznaczone z góry są usługi i produkty wizyty, bo to najczęstszy wybór — odznaczenie
// jednej pozycji jest tańsze niż zaznaczenie dziesięciu.
//
// Układ: certyfikat jest gotowy od pierwszej chwili, a okno ma to powiedzieć. Poprzednia
// wersja rozkładała wszystko naraz — cztery sekcje z notką, każda zaznaczona pozycja jako
// niebieski blok, pełne treści instrukcji, dwa pola wyszukiwania i pole uwag. Przy trzech
// usługach i trzech instrukcjach dawało to ścianę jednakowo mocnych prostokątów, bez
// jednej rzeczy, na którą patrzy się najpierw (CLAUDE.md §2), i zniechęcało do użycia.
// Teraz sekcje są zwinięte do jednej linii z podsumowaniem („3 z 3"), szczegóły otwiera
// się tylko po to, żeby coś ukryć albo dopisać, a jedynym wypełnieniem jest „Pobierz
// certyfikat" w stopce — wolno mu, bo okno jest otwartym edytorem (wyjątek z §2).

const Lead = styled.p`
    margin: 0 0 14px;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.textSecondary};
`;

const Sections = styled.div`
    display: flex;
    flex-direction: column;
    border-top: 1px solid ${ui.line};
`;

const Block = styled.section`
    border-bottom: 1px solid ${ui.line};
`;

const Toggle = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 60px;
    padding: 10px 2px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    color: ${ui.ink};

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; border-radius: ${ui.radiusRow}; }
    &:hover .chevron { color: ${ui.brandInk}; }
`;

const Glyph = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: ${ui.brandTint};
    color: ${ui.brandInk};
    svg { width: 17px; height: 17px; }
`;

const ToggleText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
`;
const ToggleTitle = styled.span` font-size: 15px; font-weight: 700; `;
const ToggleSummary = styled.span<{ $quiet?: boolean }>`
    font-size: 12.5px;
    color: ${p => (p.$quiet ? ui.textFaint : ui.textMuted)};
`;
const Chevron = styled(ChevronDown)<{ $open: boolean }>`
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    color: ${ui.textFaint};
    transform: rotate(${p => (p.$open ? 180 : 0)}deg);
    transition: transform 150ms ease, color 150ms ease;
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 0 16px 46px;

    @media (max-width: 480px) { padding-left: 0; }
`;

/* Zaznaczenie niesie ptaszek, nie tło: lista z ośmiu niebieskich bloków była właśnie tym,
   co przytłaczało. Odznaczona pozycja szarzeje — widać, czego klient nie zobaczy. */
const CheckList = styled.div` display: flex; flex-direction: column; `;
const Row = styled.label<{ $on: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;
    cursor: pointer;
    color: ${p => (p.$on ? ui.ink : ui.textFaint)};
    & + & { border-top: 1px solid ${ui.lineFaint}; }
`;
const Check = styled.input`
    margin: 2px 0 0;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    accent-color: ${ui.brand};
    cursor: pointer;
`;
const RowMain = styled.div` flex: 1; min-width: 0; `;
const RowTitle = styled.div` font-size: 13.5px; font-weight: 600; overflow-wrap: anywhere; `;
const RowMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    font-size: 12px;
    color: ${ui.textMuted};
    overflow-wrap: anywhere;
`;
/* Treść instrukcji bywa akapitem. W oknie wystarczy jej początek — całość i tak idzie na
   certyfikat, a pełne akapity pod każdą pozycją robiły z sekcji ścianę tekstu. */
const Excerpt = styled.div`
    font-size: 12px;
    line-height: 1.45;
    color: ${ui.textMuted};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;
const RowHint = styled.div` margin-top: 2px; font-size: 11.5px; font-weight: 600; color: ${ui.brandInk}; `;

const Manual = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 0;
    & + & { border-top: 1px solid ${ui.lineFaint}; }
`;
const ManualHead = styled.div` display: flex; align-items: flex-start; gap: 10px; `;
const CareArea = styled.textarea`
    width: 100%;
    min-height: 72px;
    resize: vertical;
    padding: 10px 12px;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.ink};
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    &:focus { outline: none; border-color: ${ui.focusRing}; box-shadow: 0 0 0 3px ${ui.brandTintHover}; }
`;
const NoteInput = styled.input`
    width: 100%;
    padding: 7px 10px;
    font-family: inherit;
    font-size: 12.5px;
    color: ${ui.ink};
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    &:focus { outline: none; border-color: ${ui.focusRing}; box-shadow: 0 0 0 3px ${ui.brandTintHover}; }
`;
const RemoveBtn = styled.button`
    background: none; border: none; color: ${ui.textFaint}; cursor: pointer; padding: 2px;
    &:hover { color: ${ui.dangerInk}; }
`;
const Empty = styled.p` margin: 0; font-size: 13px; color: ${ui.textMuted}; `;
const AddNote = styled.div` display: flex; `;

/* Jedyny wypełniony element okna: dwie linie (co się stanie i co wejdzie do pliku),
   kafelek ikony, gradient marki — wzorzec FooterPrimary z podglądu leada. */
const Primary = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 11px;
    min-height: 52px;
    padding: 0 18px 0 12px;
    border: none;
    border-radius: 16px;
    background: linear-gradient(135deg, ${ui.brand} 0%, ${ui.brandDeep} 100%);
    color: #ffffff;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.16), 0 12px 24px -12px rgba(2, 132, 199, 0.75);
    transition: transform 150ms ease, box-shadow 150ms ease;

    .glyph {
        display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        width: 32px; height: 32px; border-radius: 10px; background: rgba(255, 255, 255, 0.18);
        svg { width: 17px; height: 17px; }
    }
    .labels { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .title { font-size: 14.5px; font-weight: 600; line-height: 1.2; }
    .sub { font-size: 11.5px; line-height: 1.2; color: rgba(255, 255, 255, 0.8); }

    &:hover:not(:disabled) { transform: translateY(-1px); }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 3px; }
    &:disabled { opacity: 0.55; cursor: default; box-shadow: none; }

    @media (max-width: 640px) { flex: 1; }
`;

const Combo = styled.div` position: relative; `;
const LeadIcon = styled.span` display: inline-flex; padding-left: 12px; color: ${st.textMuted}; flex-shrink: 0; `;
// Lista podpowiedzi w PORTALU z pozycją `fixed`: treść okna się przewija i ma własne
// przycięcie, więc `absolute` w środku ucinałby listę razem z kontenerem.
const Menu = styled.div`
    position: fixed; z-index: 1300;
    background: ${st.bgCard}; border: 1px solid ${st.border}; border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowMd}; overflow: hidden; max-height: 260px; overflow-y: auto;
`;
const Option = styled.button`
    display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
    padding: 10px 12px; background: none; border: none; cursor: pointer;
    font-family: inherit; font-size: 13px; color: ${st.text};
    &:hover { background: ${st.bgCardAlt}; }
    & + & { border-top: 1px solid ${st.border}; }
`;
const FreeText = styled(Option)` color: ${st.accentBlue}; font-weight: 600; `;
const MenuHint = styled.div` padding: 10px 12px; font-size: 12.5px; color: ${st.textMuted}; `;

/** 1 pozycja, 2 pozycje, 5 pozycji, 22 pozycje. */
function plural(n: number, one: string, few: string, many: string): string {
    if (n === 1) return one;
    const tens = n % 100;
    const units = n % 10;
    return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

type SectionKey = 'services' | 'products' | 'recommended' | 'care';

/** Pozycja wpisana ręcznie. `key` istnieje tylko po to, żeby React nie gubił pól notatki. */
interface ManualEntry extends CertificateProductEntry {
    key: string;
    /** Marka i opakowanie z katalogu pod nazwą — na certyfikat i tak wchodzą z serwera. */
    meta: string[];
}

let manualSeq = 0;
const nextKey = () => `manual-${++manualSeq}`;

/**
 * Pole „wyszukaj w katalogu albo wpisz z ręki".
 *
 * Wolna nazwa jest równoprawna, a nie awaryjna: polecamy i zużywamy preparaty, których
 * nie mamy u siebie w katalogu, a zmuszanie do założenia karty produktu tylko po to,
 * żeby wpisać go na certyfikat, zaśmieciłoby katalog.
 */
function ProductPicker({ placeholder, catalog, onPick }: {
    placeholder: string;
    /** Czy w ogóle wolno szukać w katalogu — studio bez modułu produktów dostaje 403. */
    catalog: boolean;
    onPick: (entry: ManualEntry) => void;
}) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const debounced = useDebounce(search, 250);
    const { products, isLoading } = useProducts(
        { search: debounced, page: 1, limit: 8 },
        { enabled: catalog && debounced.trim().length > 0 },
    );
    const wrapRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

    const trimmed = search.trim();
    const visible = open && trimmed.length > 0;

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const measure = useCallback(() => {
        const r = wrapRef.current?.getBoundingClientRect();
        if (r) setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }, []);
    useLayoutEffect(() => {
        if (!visible) return;
        measure();
        window.addEventListener('scroll', measure, true);
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('scroll', measure, true);
            window.removeEventListener('resize', measure);
        };
    }, [visible, measure]);

    const take = (entry: Omit<ManualEntry, 'key'>) => {
        onPick({ ...entry, key: nextKey() });
        setSearch('');
        setOpen(false);
    };

    return (
        <Combo ref={wrapRef}>
            <InputShell>
                <LeadIcon><Search size={15} /></LeadIcon>
                <BareInput
                    placeholder={placeholder}
                    value={search}
                    onChange={e => { setSearch(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                />
            </InputShell>
            {visible && rect && createPortal(
                <Menu ref={menuRef} style={{ top: rect.top, left: rect.left, width: rect.width }}>
                    {catalog && products.map(p => (
                        <Option
                            key={p.id}
                            type="button"
                            onClick={() => take({
                                productId: p.id,
                                name: p.name,
                                note: null,
                                meta: [p.brand, `${p.packageSizeValue} ${p.packageSizeUnit}`]
                                    .filter((x): x is string => Boolean(x)),
                            })}
                        >
                            <Package size={14} />
                            {[p.brand, p.name].filter(Boolean).join(' ')}
                        </Option>
                    ))}
                    {catalog && isLoading && products.length === 0 && <MenuHint>Szukam w katalogu…</MenuHint>}
                    <FreeText
                        type="button"
                        onClick={() => take({ productId: null, name: trimmed, note: null, meta: [] })}
                    >
                        <Plus size={14} /> Dopisz „{trimmed}" spoza katalogu
                    </FreeText>
                </Menu>,
                document.body,
            )}
        </Combo>
    );
}

interface Props {
    visit: Visit;
    onClose: () => void;
}

export function QualityCertificateModal({ visit, onClose }: Props) {
    const { showError, showSuccess } = useToast();
    const { can } = usePermissions();
    // Moduł produktów jest sprzedawany osobno. Bez niego certyfikat nadal ma sens —
    // usługi i zalecenia wpisane z ręki wystarczą — więc okno nie odmawia, tylko
    // przestaje pytać katalog o cokolwiek.
    const canProducts = can('PRODUCTS_VIEW');
    const { links } = useVisitProducts(canProducts ? visit.id : undefined);

    // Odrzucone usługi nie zostały wykonane — na certyfikacie nie mają czego szukać
    // i nie ma po co ich pokazywać do odznaczania.
    const services = useMemo(
        () => visit.services.filter(s => s.status !== 'REJECTED'),
        [visit.services],
    );

    // Usługi są w wizycie, zanim okno się zamontuje, więc zaznaczenie startowe liczymy raz,
    // przy tworzeniu stanu. Efekt przestawiałby je przy każdym odświeżeniu wizyty w tle
    // (react-query potrafi odświeżyć po powrocie do karty) i kasował odznaczenia.
    const [serviceIds, setServiceIds] = useState<Set<string>>(() => new Set(services.map(s => s.id)));
    const [linkIds, setLinkIds] = useState<Set<string>>(new Set());
    const [extras, setExtras] = useState<ManualEntry[]>([]);
    const [recommended, setRecommended] = useState<ManualEntry[]>([]);
    const [careNote, setCareNote] = useState('');
    // Odstępstwa od zaznaczenia automatycznego. Trzymamy je osobno, zamiast jednego
    // zbioru „zaznaczone": inaczej odznaczenie usługi cofałoby ręczną decyzję
    // użytkownika albo — odwrotnie — zamrażałoby listę przy pierwszej zmianie.
    const [careOn, setCareOn] = useState<Set<string>>(new Set());
    const [careOff, setCareOff] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);

    const { instructions } = useCareInstructions();

    // Identyfikatory KATALOGOWE zaznaczonych usług — po nich idzie przypisanie
    // instrukcji. Pozycja wizyty ma własne id, które z cennikiem nie ma nic wspólnego.
    const selectedCatalogServiceIds = useMemo(
        () => new Set(services.filter(s => serviceIds.has(s.id)).map(s => s.serviceId).filter(Boolean)),
        [services, serviceIds],
    );

    const autoCareIds = useMemo(() => new Set(
        instructions
            .filter(i => i.isDefaultSelected || i.serviceIds.some(id => selectedCatalogServiceIds.has(id)))
            .map(i => i.id),
    ), [instructions, selectedCatalogServiceIds]);

    const careSelected = useMemo(() => {
        const next = new Set(autoCareIds);
        careOn.forEach(id => next.add(id));
        careOff.forEach(id => next.delete(id));
        return next;
    }, [autoCareIds, careOn, careOff]);

    const toggleCare = (id: string) => {
        const isOn = careSelected.has(id);
        setCareOn(prev => {
            const next = new Set(prev);
            if (isOn) next.delete(id); else next.add(id);
            return next;
        });
        setCareOff(prev => {
            const next = new Set(prev);
            if (isOn) next.add(id); else next.delete(id);
            return next;
        });
    };

    // Powiązania z produktami dociągają się osobnym zapytaniem, więc ich zaznaczenie musi
    // poczekać na dane — ale tylko RAZ, z tego samego powodu co wyżej.
    const linksSeeded = useRef(false);
    useEffect(() => {
        if (linksSeeded.current || links.length === 0) return;
        linksSeeded.current = true;
        setLinkIds(new Set(links.map(l => l.id)));
    }, [links]);

    const toggle = (set: Set<string>, id: string, apply: (next: Set<string>) => void) => {
        const next = new Set(set);
        if (next.has(id)) next.delete(id); else next.add(id);
        apply(next);
    };

    const patchNote = (
        list: ManualEntry[],
        apply: (next: ManualEntry[]) => void,
        key: string,
        note: string,
    ) => apply(list.map(e => (e.key === key ? { ...e, note: note || null } : e)));

    const nothingSelected =
        serviceIds.size === 0 && linkIds.size === 0 && extras.length === 0
        && recommended.length === 0 && careSelected.size === 0 && careNote.trim().length === 0;

    const generate = async () => {
        setBusy(true);
        try {
            await qualityCertificateApi.generate(
                visit.id,
                {
                    serviceIds: [...serviceIds],
                    productLinkIds: [...linkIds],
                    extraProducts: extras.map(({ productId, name, note }) => ({ productId, name, note })),
                    recommendations: recommended.map(({ productId, name, note }) => ({ productId, name, note })),
                    careInstructionIds: [...careSelected],
                    careNote: careNote.trim() || null,
                },
                visit.visitNumber,
            );
            showSuccess('Certyfikat wygenerowany', 'Plik PDF został pobrany.');
            onClose();
        } catch {
            showError('Nie udało się wygenerować certyfikatu', 'Spróbuj ponownie za chwilę.');
        } finally {
            setBusy(false);
        }
    };

    const [open, setOpen] = useState<Set<SectionKey>>(new Set());
    const toggleSection = (key: SectionKey) => setOpen(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });
    // Pole uwag jest rzadkie — schowane za przyciskiem, dopóki nikt nic nie wpisał.
    const [noteOpen, setNoteOpen] = useState(false);

    const productsTotal = links.length + extras.length;
    const productsOn = linkIds.size + extras.length;
    const itemsOnCertificate = serviceIds.size + productsOn + recommended.length + careSelected.size;

    const summaries: Record<SectionKey, { text: string; quiet?: boolean }> = {
        services: services.length === 0
            ? { text: 'Wizyta nie ma usług', quiet: true }
            : { text: `${serviceIds.size} z ${services.length} na certyfikacie` },
        products: productsTotal === 0
            ? { text: 'Brak, możesz dopisać', quiet: true }
            : { text: `${productsOn} z ${productsTotal} na certyfikacie` },
        recommended: recommended.length === 0
            ? { text: 'Opcjonalnie', quiet: true }
            : { text: `${recommended.length} ${plural(recommended.length, 'produkt', 'produkty', 'produktów')}` },
        care: instructions.length === 0 && !careNote.trim()
            ? { text: 'Brak instrukcji w ustawieniach', quiet: true }
            : {
                text: [
                    `${careSelected.size} ${plural(careSelected.size, 'instrukcja', 'instrukcje', 'instrukcji')}`,
                    careNote.trim() ? 'z uwagą' : null,
                ].filter(Boolean).join(', '),
            },
    };

    const section = (key: SectionKey, icon: ReactNode, title: string, body: ReactNode) => {
        const isOpen = open.has(key);
        const summary = summaries[key];
        return (
            <Block aria-labelledby={`cert-${key}-title`}>
                <Toggle
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`cert-${key}-body`}
                    onClick={() => toggleSection(key)}
                >
                    <Glyph aria-hidden>{icon}</Glyph>
                    <ToggleText>
                        <ToggleTitle id={`cert-${key}-title`}>{title}</ToggleTitle>
                        <ToggleSummary $quiet={summary.quiet}>{summary.text}</ToggleSummary>
                    </ToggleText>
                    <Chevron className="chevron" $open={isOpen} aria-hidden />
                </Toggle>
                {isOpen && <Body id={`cert-${key}-body`}>{body}</Body>}
            </Block>
        );
    };

    const manualList = (
        list: ManualEntry[],
        apply: (next: ManualEntry[]) => void,
        notePlaceholder: string,
    ) => list.map(entry => (
        <Manual key={entry.key}>
            <ManualHead>
                <RowMain>
                    <RowTitle>{entry.name}</RowTitle>
                    {entry.meta.length > 0 && (
                        <RowMeta>{entry.meta.map(m => <span key={m}>{m}</span>)}</RowMeta>
                    )}
                </RowMain>
                <RemoveBtn
                    type="button"
                    aria-label={`Usuń ${entry.name}`}
                    onClick={() => apply(list.filter(e => e.key !== entry.key))}
                >
                    <X size={16} />
                </RemoveBtn>
            </ManualHead>
            <NoteInput
                aria-label={`Notatka: ${entry.name}`}
                placeholder={notePlaceholder}
                value={entry.note ?? ''}
                onChange={e => patchNote(list, apply, entry.key, e.target.value)}
            />
        </Manual>
    ));

    const customerName = [visit.customer?.firstName, visit.customer?.lastName].filter(Boolean).join(' ');
    const vehicleName = [visit.vehicle?.brand, visit.vehicle?.model, visit.vehicle?.licensePlate].filter(Boolean).join(' ');

    return (
        <ModalShell isOpen onClose={onClose} maxWidth="600px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Certyfikat jakości</ModalTitle>
                    <ModalSubtitle>
                        {[customerName, vehicleName].filter(Boolean).join(', ') || 'Dokument dla klienta'}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Lead>
                    Usługi i produkty z wizyty są już zaznaczone. Rozwiń sekcję tylko wtedy, gdy
                    chcesz coś ukryć przed klientem albo dopisać.
                </Lead>

                <Sections>
                    {section('services', <Wrench />, 'Wykonane usługi', (
                        services.length === 0 ? <Empty>Ta wizyta nie ma usług do wypisania.</Empty> : (
                            <CheckList>
                                {services.map(s => (
                                    <Row key={s.id} $on={serviceIds.has(s.id)}>
                                        <Check
                                            type="checkbox"
                                            checked={serviceIds.has(s.id)}
                                            onChange={() => toggle(serviceIds, s.id, setServiceIds)}
                                        />
                                        <RowMain>
                                            <RowTitle>{s.serviceName}</RowTitle>
                                            {s.note && <RowMeta><span>{s.note}</span></RowMeta>}
                                        </RowMain>
                                    </Row>
                                ))}
                            </CheckList>
                        )
                    ))}

                    {section('products', <Package />, 'Użyte produkty', (
                        <>
                            {links.length > 0 && (
                                <CheckList>
                                    {links.map(l => (
                                        <Row key={l.id} $on={linkIds.has(l.id)}>
                                            <Check
                                                type="checkbox"
                                                checked={linkIds.has(l.id)}
                                                onChange={() => toggle(linkIds, l.id, setLinkIds)}
                                            />
                                            <RowMain>
                                                <RowTitle>{[l.brand, l.productName].filter(Boolean).join(' ')}</RowTitle>
                                                {(l.packageLabel || l.note) && (
                                                    <RowMeta>
                                                        {l.packageLabel && <span>{l.packageLabel}</span>}
                                                        {l.note && <span>{l.note}</span>}
                                                    </RowMeta>
                                                )}
                                            </RowMain>
                                        </Row>
                                    ))}
                                </CheckList>
                            )}
                            {manualList(extras, setExtras, 'Notatka pod pozycją (opcjonalnie)')}
                            <ProductPicker
                                placeholder={canProducts
                                    ? 'Dopisz użyty produkt z katalogu lub z ręki'
                                    : 'Dopisz użyty produkt'}
                                catalog={canProducts}
                                onPick={entry => setExtras(prev => [...prev, entry])}
                            />
                        </>
                    ))}

                    {section('recommended', <Award />, 'Polecane do pielęgnacji', (
                        <>
                            {manualList(recommended, setRecommended, 'Np. co dwa tygodnie, metodą dwóch wiader')}
                            <ProductPicker
                                placeholder={canProducts
                                    ? 'Poleć produkt z katalogu lub z ręki'
                                    : 'Poleć produkt'}
                                catalog={canProducts}
                                onPick={entry => setRecommended(prev => [...prev, entry])}
                            />
                        </>
                    ))}

                    {section('care', <Droplets />, 'Jak utrzymać efekt', (
                        <>
                            {instructions.length === 0 ? (
                                <Empty>
                                    Słownik instrukcji jest pusty. Uzupełnisz go w Ustawieniach, w Cenniku
                                    usług, w zakładce Instrukcje pielęgnacji.
                                </Empty>
                            ) : (
                                <CheckList>
                                    {instructions.map(instruction => {
                                        const on = careSelected.has(instruction.id);
                                        const fromService = !instruction.isDefaultSelected
                                            && instruction.serviceIds.some(id => selectedCatalogServiceIds.has(id));
                                        return (
                                            <Row key={instruction.id} $on={on}>
                                                <Check type="checkbox" checked={on} onChange={() => toggleCare(instruction.id)} />
                                                <RowMain>
                                                    <RowTitle>{instruction.title}</RowTitle>
                                                    <Excerpt title={instruction.content}>{instruction.content}</Excerpt>
                                                    {fromService && on && <RowHint>Dobrana do wybranej usługi</RowHint>}
                                                </RowMain>
                                            </Row>
                                        );
                                    })}
                                </CheckList>
                            )}
                            {noteOpen || careNote ? (
                                <CareArea
                                    aria-label="Uwagi tylko do tego certyfikatu"
                                    autoFocus={noteOpen && !careNote}
                                    value={careNote}
                                    onChange={e => setCareNote(e.target.value)}
                                    placeholder="Np. auto odbierane w deszczu, przełóż pierwsze mycie."
                                />
                            ) : (
                                <AddNote>
                                    <Button variant="ghost" size="sm" onClick={() => setNoteOpen(true)}>
                                        <Plus />Dodaj uwagę do tego certyfikatu
                                    </Button>
                                </AddNote>
                            )}
                        </>
                    ))}
                </Sections>
            </ModalContent>

            <ModalFooter>
                <Button variant="ghost" onClick={onClose} disabled={busy}>Anuluj</Button>
                <Primary type="button" onClick={generate} disabled={busy || nothingSelected}>
                    <span className="glyph"><FileDown /></span>
                    <span className="labels">
                        <span className="title">{busy ? 'Generuję…' : 'Pobierz certyfikat'}</span>
                        <span className="sub">
                            {nothingSelected
                                ? 'Zaznacz choć jedną pozycję'
                                : `PDF, ${itemsOnCertificate} ${plural(itemsOnCertificate, 'pozycja', 'pozycje', 'pozycji')}`}
                        </span>
                    </span>
                </Primary>
            </ModalFooter>
        </ModalShell>
    );
}
