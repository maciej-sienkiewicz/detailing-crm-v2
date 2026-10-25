import { useEffect, useRef, useState } from 'react';
import { BookOpen, MoreHorizontal, Pencil, Tag, Trash2 } from 'lucide-react';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { formatCurrency } from '@/common/utils/formatters';
import { isCatalogServiceId } from '@/common/utils/catalogServiceId';
import {
    applyAdjustment, distributeAdjustment, netToGross, resolveBaseGross, resolveBaseNet, withVatRate,
} from '@/common/utils/priceAdjustment';
import { MAX_2_DECIMALS, centsToInput, handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { PRICE_SCOPES, ServicePriceModal, type PriceScope } from '@/common/components/ServicePriceModal';
import { changeLabel, describeChange } from '@/common/components/ServicePriceModal/priceDraft';
import { ActionMenu, MenuDivider, MenuItem, Notice, useActionMenu } from '@/common/components/ui';
import type { AdjustmentType, PriceAdjustment } from '@/common/utils/priceAdjustment';
import { discountBases, editedPricePair, withAdjustment } from './servicesTablePricing';
import * as S from './styles';
import { applyNewerVersion, formatVersionPrice, type ServiceVersion } from './serviceVersion';

export interface PackageItemSnapshot {
    serviceId: string;
    serviceName: string;
    position: number;
}

export interface ServiceLineItem {
    id: string;
    serviceId: string | null;
    serviceName: string;
    basePriceNet: number;
    /** Exact stored gross from the catalog / user input; display and gross-side
     *  calculations prefer it over netToGross() (1-grosz rounding gaps). */
    basePriceGross?: number;
    vatRate: number;
    adjustment: PriceAdjustment;
    note?: string;
    requireManualPrice?: boolean;
    isPackage?: boolean;
    packageItems?: PackageItemSnapshot[] | null;
    /** Aktualna wersja usługi w cenniku, gdy pozycja stoi na wygaszonej (patrz serviceVersion.ts). */
    newerVersion?: ServiceVersion | null;
}

export interface SaveServiceData {
    name: string;
    basePriceNet: number;
    basePriceGross: number;
    vatRate: number;
    requireManualPrice: boolean;
}

interface Props {
    services: ServiceLineItem[];
    onChange: (services: ServiceLineItem[]) => void;
    /** Called when user confirms an edit. Returns the new catalog service ID if the
     *  backend created a new version (immutable-update pattern), or null if unchanged. */
    onSaveService?: (serviceId: string, data: SaveServiceData) => Promise<string | null>;
    /** Gdzie obowiązuje cena pozycji - napisy okna ceny i menu wiersza. */
    scope?: PriceScope;
}

/**
 * Poniżej tej szerokości tabela przechodzi w układ wąski (nazwa + brutto + akcje
 * w dwóch wierszach). 560 px to punkt, w którym kolumny stałe (326 px) zjadają
 * nazwę usługi do kilkudziesięciu pikseli - a nazwa jest jedyną rzeczą, po której
 * pozycję da się rozpoznać.
 */
const NARROW_TABLE_WIDTH = 560;

/**
 * Kwota w komórce tabeli z polskim przecinkiem dziesiętnym. Dawniej „202.44" w wierszach,
 * a „202,44 zł" w podsumowaniu tej samej tabeli - dwa zapisy jednej liczby obok siebie.
 */
const decimalPl = (value: number): string => value.toFixed(2).replace('.', ',');

const VAT_RATES = [23, 8, 5, 0, -1] as const;
const VAT_LABEL = (rate: number) => rate === -1 ? 'zw.' : `${rate}%`;


const DISCOUNT_TYPES: { type: AdjustmentType; label: string }[] = [
    { type: 'PERCENT', label: '%' },
    { type: 'FIXED_NET', label: 'Kwota netto' },
    { type: 'FIXED_GROSS', label: 'Kwota brutto' },
    { type: 'SET_NET', label: 'Cena netto' },
    { type: 'SET_GROSS', label: 'Cena brutto' },
];


/**
 * Czy tabela jest wąska - mierzone na NIEJ SAMEJ, a nie na oknie przeglądarki.
 *
 * Media query odpowiada na pytanie „czy to telefon", a tabela potrzebuje odpowiedzi
 * na „czy mam gdzie się rozłożyć". To dwie różne rzeczy: wstawiona w 288-pikselową
 * szynę na monitorze 1920 px tabela dostawała układ szeroki i nazwy usług znikały
 * całkowicie. Obserwator odpowiada na to drugie pytanie.
 */
const useNarrowTable = () => {
    const blockRef = useRef<HTMLDivElement>(null);
    const [isNarrow, setIsNarrow] = useState(false);

    useEffect(() => {
        const element = blockRef.current;
        // jsdom w testach nie ma ResizeObservera; wtedy zostaje media query.
        if (!element || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width ?? 0;
            setIsNarrow(width > 0 && width < NARROW_TABLE_WIDTH);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return { blockRef, isNarrow };
};

const IconChevronDown = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const IconPercent = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
);

const IconMessageSquare = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const IconCheck = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

/**
 * Wiersz ma dwie drogi zmiany ceny i celowo wyglądają zupełnie inaczej:
 *
 *  - klik w CENĘ → „Cena w tej rezerwacji" (ustal cenę, rabat, dopłata). Zmienia
 *    wyłącznie tę pozycję; cennik i statystyki cennika zostają nietknięte;
 *  - menu ⋯ → „Zmień w cenniku…" → nowa wersja usługi dla WSZYSTKICH kolejnych
 *    rezerwacji, z ostrzeżeniem w oknie.
 *
 * Wcześniej stały obok siebie ołówek „Edytuj pozycję" (cennik!) i % „Rabat"
 * (ta pozycja). Ołówek przy wierszu czytano jako „popraw ten wiersz", a podwyżki
 * nikt nie szukał pod słowem „rabat" - więc ceny jednej wizyty lądowały w cenniku.
 */
export const ServicesTable = ({ services, onChange, onSaveService, scope = PRICE_SCOPES.reservation }: Props) => {
    const { blockRef, isNarrow } = useNarrowTable();
    const rowMenu = useActionMenu<string>();

    const [expandedNote, setExpandedNote] = useState<string | null>(null);

    // Per-service discount modal state
    const [discountModalId, setDiscountModalId] = useState<string | null>(null);

    // Bulk discount modal state
    const [bulkDiscountOpen, setBulkDiscountOpen] = useState(false);
    const [bulkDiscountType, setBulkDiscountType] = useState<AdjustmentType>('PERCENT');
    const [bulkDiscountValue, setBulkDiscountValue] = useState('');

    // Bulk VAT modal state
    const [bulkVatOpen, setBulkVatOpen] = useState(false);
    const [bulkVatRate, setBulkVatRate] = useState<number>(23);

    // Edit service modal state
    const [editModalServiceId, setEditModalServiceId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editNetInput, setEditNetInput] = useState('');
    const [editGrossInput, setEditGrossInput] = useState('');
    const [editPriceNet, setEditPriceNet] = useState(0);
    const [editPriceGross, setEditPriceGross] = useState(0);
    const [editVatRate, setEditVatRate] = useState<number>(23);
    const [editError, setEditError] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    const getServicePrice = (service: ServiceLineItem) => {
        const result = applyAdjustment(service.basePriceNet, service.vatRate, service.adjustment, service.basePriceGross);
        // Cena wyjściowa tak, jak liczy ją okno ceny: pozycja z ceną ręczną (baza 0
        // + SET_*) ma za wyjście ustaloną cenę, a nie zero - inaczej wiersz pokazywał
        // przekreślone „0.00" i znacznik zmiany, choć nikt niczego nie zmienił.
        const base = { netCents: resolveBaseNet(service), exactGrossCents: resolveBaseGross(service), vatRate: service.vatRate };
        const change = describeChange(base, service.adjustment);
        const baseGrossCents = base.exactGrossCents ?? netToGross(base.netCents, service.vatRate);
        return {
            baseNet: base.netCents / 100,
            baseGross: baseGrossCents / 100,
            finalNet: result.finalNetCents / 100,
            finalGross: result.finalGrossCents / 100,
            change,
        };
    };

    const openDiscountModal = (service: ServiceLineItem) => {
        setDiscountModalId(service.id);
    };

    const closeDiscountModal = () => {
        setDiscountModalId(null);
    };

    // Rabat podmieniany przez withAdjustment: pozycja z ceną ręczną (baza 0 + SET_*)
    // najpierw przenosi ustaloną cenę do bazy, inaczej rabat liczyłby się od zera.
    // Potem stawka - tym samym withVatRate, którym okno ceny liczyło podgląd, więc
    // zapisana pozycja jest dokładnie tą, którą człowiek widział przed „Zastosuj".
    const applyServiceDiscount = (adjustment: PriceAdjustment, vatRate: number) => {
        if (!discountModalId) return;
        onChange(services.map(s => s.id === discountModalId
            ? withVatRate(withAdjustment(s, adjustment), vatRate)
            : s));
        closeDiscountModal();
    };

    const removeServiceDiscount = () => {
        if (!discountModalId) return;
        onChange(services.map(s => s.id === discountModalId
            ? withAdjustment(s, { type: 'PERCENT', value: 0 })
            : s
        ));
        closeDiscountModal();
    };

    const applyBulkDiscount = () => {
        const val = parseFloat(bulkDiscountValue.replace(',', '.'));
        if (isNaN(val) || val <= 0) return;
        const valueInCents = bulkDiscountType === 'PERCENT' ? val : Math.round(val * 100);
        const adjustments = distributeAdjustment(discountBases(services), bulkDiscountType, valueInCents);
        onChange(services.map((s, i) => withAdjustment(s, adjustments[i])));
        setBulkDiscountOpen(false);
        setBulkDiscountValue('');
    };

    const openEditModal = (service: ServiceLineItem) => {
        const gross = service.basePriceGross ?? netToGross(service.basePriceNet, service.vatRate);
        setEditModalServiceId(service.id);
        setEditName(service.serviceName);
        setEditVatRate(service.vatRate);
        setEditPriceNet(service.basePriceNet);
        setEditPriceGross(gross);
        setEditNetInput(centsToInput(service.basePriceNet));
        setEditGrossInput(centsToInput(gross));
        setEditError('');
        setEditSaving(false);
    };

    // Para zmienia się zawsze w całości (editedPricePair): puste pole czyści też drugie,
    // żeby do cennika nie poszła połowa pary sprzed zmiany.
    const handleEditNetChange = (raw: string) => {
        if (!MAX_2_DECIMALS.test(raw)) return;
        setEditNetInput(raw);
        setEditError('');
        const { netCents, grossCents } = editedPricePair(raw, 'net', editVatRate);
        setEditPriceNet(netCents);
        setEditPriceGross(grossCents);
        setEditGrossInput(netCents > 0 ? centsToInput(grossCents) : '');
    };

    const handleEditGrossChange = (raw: string) => {
        if (!MAX_2_DECIMALS.test(raw)) return;
        setEditGrossInput(raw);
        setEditError('');
        const { netCents, grossCents } = editedPricePair(raw, 'gross', editVatRate);
        setEditPriceGross(grossCents);
        setEditPriceNet(netCents);
        setEditNetInput(grossCents > 0 ? centsToInput(netCents) : '');
    };

    const saveEditService = async () => {
        if (!editModalServiceId) return;
        const service = services.find(s => s.id === editModalServiceId);
        if (!service) return;

        const trimmedName = editName.trim();
        if (!trimmedName || trimmedName.length < 3) {
            setEditError('Nazwa musi mieć co najmniej 3 znaki');
            return;
        }
        if (!service.requireManualPrice && editPriceNet <= 0) {
            setEditError('Podaj poprawną cenę');
            return;
        }

        // Zapis bez zmian nie jest zmianą. To okno zapisuje pozycję DO KATALOGU usług,
        // więc samo otwarcie i „Zapisz" zakładało nową wersję usługi i dokładało do
        // Aktywności wiersz „Zaktualizowano usługę" bez ani jednej zmiany w środku -
        // nie do odróżnienia od wiersza sprzed chwili, który zmiany niósł.
        const currentGross = service.basePriceGross ?? netToGross(service.basePriceNet, service.vatRate);
        const nothingChanged =
            trimmedName === service.serviceName &&
            editVatRate === service.vatRate &&
            (service.requireManualPrice
                ? true
                : editPriceNet === service.basePriceNet && editPriceGross === currentGross);

        // Pozycja spoza cennika (usługa założona w locie, `temp-…`) zmienia się tylko
        // tutaj, na tej wycenie - w cenniku nie ma jej wersji do podmiany. Wcześniej jej
        // identyfikator zastępczy szedł do `POST /services/update`, backend odrzucał go
        // jako nie-UUID i ceny takiej pozycji nie dało się zmienić wcale.
        let newServiceId: string | null = null;
        if (onSaveService && isCatalogServiceId(service.serviceId) && !nothingChanged) {
            setEditSaving(true);
            try {
                newServiceId = await onSaveService(service.serviceId, {
                    name: trimmedName,
                    basePriceNet: service.requireManualPrice ? service.basePriceNet : editPriceNet,
                    basePriceGross: service.requireManualPrice ? (service.basePriceGross ?? service.basePriceNet) : editPriceGross,
                    vatRate: editVatRate,
                    requireManualPrice: service.requireManualPrice ?? false,
                });
            } catch {
                setEditError('Nie udało się zapisać. Spróbuj ponownie.');
                setEditSaving(false);
                return;
            }
            setEditSaving(false);
        }

        onChange(services.map(s => s.id === editModalServiceId
            ? {
                ...s,
                id: newServiceId ?? s.id,
                serviceId: newServiceId ?? s.serviceId,
                serviceName: trimmedName,
                basePriceNet: service.requireManualPrice ? s.basePriceNet : editPriceNet,
                basePriceGross: service.requireManualPrice ? s.basePriceGross : editPriceGross,
              }
            : s
        ));
        setEditModalServiceId(null);
    };

    let totalNet = 0;
    let totalGross = 0;
    services.forEach(s => {
        const p = getServicePrice(s);
        totalNet += p.finalNet;
        totalGross += p.finalGross;
    });
    const totalVat = Math.round((totalGross - totalNet) * 100) / 100;
    totalNet = Math.round(totalNet * 100) / 100;
    totalGross = Math.round(totalGross * 100) / 100;

    const discountModalService = discountModalId ? services.find(s => s.id === discountModalId) : null;

    // „Łącznie przed rabatem" z tych samych baz, od których rozłoży się rabat - pozycja
    // z ceną ręczną (baza 0 + SET_*) wlicza się ustaloną ceną, a nie zerem.
    const bulkBases = discountBases(services);
    const bulkBaseNet = Math.round(bulkBases.reduce((sum, b) => sum + b.basePriceNetCents, 0)) / 100;
    const bulkBaseGross = Math.round(bulkBases.reduce((sum, b) => {
        return sum + (b.basePriceGrossCents ?? netToGross(b.basePriceNetCents, b.vatRate));
    }, 0)) / 100;

    const editService = editModalServiceId ? services.find(s => s.id === editModalServiceId) : null;
    // Okno edycji ma dwa znaczenia i mówi wprost, które: usługa z cennika zmienia się
    // DLA WSZYSTKICH (nowa wersja w cenniku), usługa założona w locie - tylko tutaj.
    const editGoesToCatalog = !!editService && !!onSaveService && isCatalogServiceId(editService.serviceId);

    const menuService = rowMenu.menu ? services.find(s => s.id === rowMenu.menu!.item) : null;
    const canEditService = (service: ServiceLineItem) => !!service.serviceId && !service.isPackage;
    const goesToCatalog = (service: ServiceLineItem) => !!onSaveService && isCatalogServiceId(service.serviceId);

    // Cena ręczna wraca z API także bez flagi - jako baza 0 i cena w SET_* (resolveBaseNet).
    const hasManualPrice = (service: ServiceLineItem) =>
        !!service.requireManualPrice || resolveBaseNet(service) !== service.basePriceNet;
    const priceBaseLabel = (service: ServiceLineItem) =>
        hasManualPrice(service) ? 'Cena ustalona ręcznie'
        : isCatalogServiceId(service.serviceId) ? 'Cena z cennika'
        : 'Cena wyjściowa';

    return (
        <>
            <S.ServicesBlock ref={blockRef} $narrow={isNarrow}>
                <S.PricedTableHeader>
                    <S.ServicesHeaderCell>Usługa</S.ServicesHeaderCell>
                    <S.ServicesHeaderCell>Netto</S.ServicesHeaderCell>
                    <S.VatHeaderCell>
                        VAT
                        <S.VatHeaderBtn
                            type="button"
                            title="Zmień stawkę VAT dla wszystkich"
                            disabled={services.length === 0}
                            onClick={() => {
                                setBulkVatRate(services[0]?.vatRate ?? 23);
                                setBulkVatOpen(true);
                            }}
                        >
                            <IconChevronDown />
                        </S.VatHeaderBtn>
                    </S.VatHeaderCell>
                    <S.ServicesHeaderCell>Brutto</S.ServicesHeaderCell>
                    <S.ServicesHeaderCell />
                </S.PricedTableHeader>

                <S.ServicesList>
                    {services.map(service => {
                        const prices = getServicePrice(service);
                        const { change, finalNet, finalGross, baseNet, baseGross } = prices;
                        const isChanged = change.kind !== 'none';
                        const isCheaper = change.kind === 'discount';
                        const tag = changeLabel(change);
                        const isNoteExpanded = expandedNote === service.id;
                        const hasNote = !!(service.note && service.note.length > 0);

                        return (
                            <S.ServiceItem key={service.id} $hasDiscount={isChanged}>
                                <S.PricedItemRow>
                                    <S.ServiceNameWrap>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <S.ServiceName title={service.serviceName}>{service.serviceName}</S.ServiceName>
                                            {service.isPackage && <S.PackageBadgeInline>Pakiet</S.PackageBadgeInline>}
                                        </div>
                                        {tag && change.kind !== 'none' && <S.PriceChangeTag $kind={change.kind}>{tag}</S.PriceChangeTag>}
                                        {hasNote && <S.ServiceNoteInline title={service.note}>{service.note}</S.ServiceNoteInline>}
                                        {service.newerVersion && (
                                            <S.PriceChangedNotice
                                                role="status"
                                                title="Bez odświeżenia pozycja zostaje przy dotychczasowej cenie"
                                            >
                                                <span>
                                                    {service.newerVersion.requireManualPrice
                                                        ? 'Usługa zmieniła się w cenniku: cena jest teraz ustalana ręcznie'
                                                        : `Nowa cena w cenniku: ${formatVersionPrice(service.newerVersion.basePriceNet)} netto / ${formatVersionPrice(service.newerVersion.basePriceGross)} brutto`}
                                                </span>
                                                <S.PriceChangedAction
                                                    type="button"
                                                    onClick={() => onChange(services.map(s => (s.id === service.id ? applyNewerVersion(s) : s)))}
                                                >
                                                    Odśwież cenę
                                                </S.PriceChangedAction>
                                            </S.PriceChangedNotice>
                                        )}
                                    </S.ServiceNameWrap>

                                    <S.PriceDisplay>
                                        <S.PriceDisplayMain $isDiscounted={isCheaper}>{decimalPl(finalNet)}</S.PriceDisplayMain>
                                        {isChanged && <S.PriceDisplayOriginal>{decimalPl(baseNet)}</S.PriceDisplayOriginal>}
                                    </S.PriceDisplay>
                                    <S.VatCell>{VAT_LABEL(service.vatRate)}</S.VatCell>
                                    <S.PriceCellButton
                                        type="button"
                                        onClick={() => openDiscountModal(service)}
                                        title={`Zmień cenę ${scope.here}`}
                                        aria-label={`Zmień cenę ${scope.here}: ${service.serviceName}, ${formatCurrency(finalGross)} brutto`}
                                    >
                                        <Pencil aria-hidden="true" />
                                        <S.PriceCellAmounts>
                                            <S.PriceDisplayMain $isBrutto $isDiscounted={isCheaper}>{decimalPl(finalGross)}</S.PriceDisplayMain>
                                            {isChanged && <S.PriceDisplayOriginal>{decimalPl(baseGross)}</S.PriceDisplayOriginal>}
                                        </S.PriceCellAmounts>
                                    </S.PriceCellButton>

                                    <S.ServiceActions>
                                        <S.IconButton
                                            type="button"
                                            onClick={() => setExpandedNote(isNoteExpanded ? null : service.id)}
                                            $active={hasNote}
                                            title="Notatka do usługi"
                                        >
                                            <IconMessageSquare />
                                        </S.IconButton>
                                        <S.IconButton
                                            type="button"
                                            $active={rowMenu.isOpen(service.id)}
                                            onClick={(e) => rowMenu.toggle(e, service.id, service.id)}
                                            title="Więcej"
                                            aria-label={`Więcej akcji: ${service.serviceName}`}
                                            aria-haspopup="menu"
                                            aria-expanded={rowMenu.isOpen(service.id)}
                                        >
                                            <MoreHorizontal />
                                        </S.IconButton>
                                    </S.ServiceActions>
                                </S.PricedItemRow>

                                {service.isPackage && service.packageItems && service.packageItems.length > 0 && (
                                    <S.PackageSubRows>
                                        {service.packageItems.map(item => (
                                            <S.PackageSubRow key={item.serviceId}>
                                                <S.PackageSubRowDot />
                                                <S.PackageSubRowName title={item.serviceName}>
                                                    {item.serviceName}
                                                </S.PackageSubRowName>
                                            </S.PackageSubRow>
                                        ))}
                                    </S.PackageSubRows>
                                )}

                                {isNoteExpanded && (
                                    <S.ServiceNoteContainer>
                                        <S.ServiceNoteTextarea
                                            placeholder="Notatka do usługi…"
                                            value={service.note || ''}
                                            onChange={(e) => onChange(services.map(s => s.id === service.id
                                                ? { ...s, note: e.target.value }
                                                : s
                                            ))}
                                            rows={2}
                                            autoFocus
                                        />
                                        <S.NoteConfirmButton
                                            type="button"
                                            onClick={() => setExpandedNote(null)}
                                        >
                                            <IconCheck />
                                            Zatwierdź
                                        </S.NoteConfirmButton>
                                    </S.ServiceNoteContainer>
                                )}
                            </S.ServiceItem>
                        );
                    })}
                </S.ServicesList>

                <S.SummarySection>
                    <S.BulkDiscountTrigger
                        type="button"
                        onClick={() => { setBulkDiscountOpen(true); setBulkDiscountValue(''); }}
                        title="Zastosuj rabat do wszystkich usług"
                        disabled={services.length === 0}
                    >
                        <IconPercent />
                        Rabatuj wszystko
                    </S.BulkDiscountTrigger>
                    <S.SummaryTotals>
                        <S.SummaryItem>
                            <S.SummaryLabel>Netto</S.SummaryLabel>
                            <S.SummaryValue>{formatCurrency(totalNet)}</S.SummaryValue>
                        </S.SummaryItem>
                        <S.SummaryItem>
                            <S.SummaryLabel>VAT</S.SummaryLabel>
                            <S.SummaryValue>{formatCurrency(totalVat)}</S.SummaryValue>
                        </S.SummaryItem>
                        <S.SummaryItem>
                            <S.SummaryLabel>Łącznie</S.SummaryLabel>
                            <S.SummaryValue $isTotal>{formatCurrency(totalGross)}</S.SummaryValue>
                        </S.SummaryItem>
                    </S.SummaryTotals>
                </S.SummarySection>
            </S.ServicesBlock>

            <ActionMenu anchor={rowMenu.menu?.anchor ?? null} onClose={rowMenu.close} label="Akcje usługi">
                {menuService && (
                    <>
                        <MenuItem icon={<Tag />} onClick={() => openDiscountModal(menuService)}>
                            Zmień cenę {scope.here}…
                        </MenuItem>
                        {canEditService(menuService) && (
                            goesToCatalog(menuService) ? (
                                <MenuItem icon={<BookOpen />} onClick={() => openEditModal(menuService)}>
                                    Zmień w cenniku…
                                </MenuItem>
                            ) : (
                                <MenuItem icon={<Pencil />} onClick={() => openEditModal(menuService)}>
                                    Edytuj usługę…
                                </MenuItem>
                            )
                        )}
                        <MenuDivider />
                        <MenuItem
                            danger
                            icon={<Trash2 />}
                            onClick={() => {
                                onChange(services.filter(s => s.id !== menuService.id));
                                if (expandedNote === menuService.id) setExpandedNote(null);
                            }}
                        >
                            Usuń {scope.from}
                        </MenuItem>
                    </>
                )}
            </ActionMenu>

            {/* Cena tej pozycji - bez cennika */}
            {discountModalId && discountModalService && (
                <ServicePriceModal
                    serviceName={discountModalService.serviceName}
                    basePriceNet={resolveBaseNet(discountModalService)}
                    basePriceGross={resolveBaseGross(discountModalService)}
                    vatRate={discountModalService.vatRate}
                    adjustment={discountModalService.adjustment}
                    scope={scope}
                    baseLabel={priceBaseLabel(discountModalService)}
                    resetLabel={isCatalogServiceId(discountModalService.serviceId) && !hasManualPrice(discountModalService)
                        ? 'Przywróć cenę z cennika'
                        : 'Usuń zmianę ceny'}
                    onApply={applyServiceDiscount}
                    onReset={removeServiceDiscount}
                    onClose={closeDiscountModal}
                />
            )}

            {/* Bulk VAT modal */}
            {bulkVatOpen && (
                <S.BulkDiscountOverlay onClick={() => setBulkVatOpen(false)}>
                    <S.BulkDiscountCard onClick={(e) => e.stopPropagation()}>
                        <S.BulkDiscountHeader>
                            <S.BulkDiscountTitle>Stawka VAT dla wszystkich</S.BulkDiscountTitle>
                            <S.CloseIconButton type="button" onClick={() => setBulkVatOpen(false)}>
                                <IconX />
                            </S.CloseIconButton>
                        </S.BulkDiscountHeader>
                        <S.BulkDiscountBody>
                            <div>
                                <S.DiscountSectionLabel>Wybierz stawkę</S.DiscountSectionLabel>
                                <S.DiscountTypeRow>
                                    {VAT_RATES.map(r => (
                                        <S.DiscountTypePill
                                            key={r}
                                            type="button"
                                            $selected={bulkVatRate === r}
                                            onClick={() => {
                                                // withVatRate: pozycja z tą samą stawką zostaje nietknięta
                                                // (razem z dokładnym brutto), brutto wpisane przez człowieka
                                                // przechodzi bez zmian, a brutto policzone przy starej stawce
                                                // znika i liczy się od netta przy nowej.
                                                onChange(services.map(s => withVatRate(s, r)));
                                                setBulkVatRate(r);
                                                setBulkVatOpen(false);
                                            }}
                                        >
                                            {VAT_LABEL(r)}
                                        </S.DiscountTypePill>
                                    ))}
                                </S.DiscountTypeRow>
                            </div>
                        </S.BulkDiscountBody>
                    </S.BulkDiscountCard>
                </S.BulkDiscountOverlay>
            )}

            {/* Bulk discount modal */}
            {bulkDiscountOpen && (
                <S.BulkDiscountOverlay onClick={() => setBulkDiscountOpen(false)}>
                    <S.BulkDiscountCard onClick={(e) => e.stopPropagation()}>
                        <S.BulkDiscountHeader>
                            <S.BulkDiscountTitle>Rabatuj wszystko</S.BulkDiscountTitle>
                            <S.CloseIconButton type="button" onClick={() => setBulkDiscountOpen(false)}>
                                <IconX />
                            </S.CloseIconButton>
                        </S.BulkDiscountHeader>
                        <S.BulkDiscountBody>
                            <S.DiscountFromBox>
                                <S.DiscountFromBoxLabel>Łącznie przed rabatem</S.DiscountFromBoxLabel>
                                <S.DiscountFromPrices>
                                    <S.DiscountFromPrice>
                                        <S.DiscountFromPriceValue>{formatCurrency(bulkBaseNet)}</S.DiscountFromPriceValue>
                                        <S.DiscountFromPriceLabel>Netto</S.DiscountFromPriceLabel>
                                    </S.DiscountFromPrice>
                                    <S.DiscountFromPrice>
                                        <S.DiscountFromPriceValue>{formatCurrency(bulkBaseGross)}</S.DiscountFromPriceValue>
                                        <S.DiscountFromPriceLabel>Brutto</S.DiscountFromPriceLabel>
                                    </S.DiscountFromPrice>
                                </S.DiscountFromPrices>
                            </S.DiscountFromBox>
                            <div>
                                <S.DiscountSectionLabel>Rodzaj rabatu</S.DiscountSectionLabel>
                                <S.DiscountTypeRow>
                                    {DISCOUNT_TYPES.map(({ type, label }) => (
                                        <S.DiscountTypePill
                                            key={type}
                                            type="button"
                                            $selected={bulkDiscountType === type}
                                            onClick={() => { setBulkDiscountType(type); setBulkDiscountValue(''); }}
                                        >
                                            {label}
                                        </S.DiscountTypePill>
                                    ))}
                                </S.DiscountTypeRow>
                            </div>
                            <div>
                                <S.DiscountSectionLabel>Wartość</S.DiscountSectionLabel>
                                <S.DiscountValueRow>
                                    <S.DiscountValueInput
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={bulkDiscountValue}
                                        onChange={(e) => { if (MAX_2_DECIMALS.test(e.target.value)) setBulkDiscountValue(e.target.value); }}
                                        onKeyDown={handleZeroAwareKeyDown(bulkDiscountValue, setBulkDiscountValue)}
                                        autoFocus
                                    />
                                    <S.DiscountValueSuffix>
                                        {bulkDiscountType === 'PERCENT' ? '%' : 'zł'}
                                    </S.DiscountValueSuffix>
                                </S.DiscountValueRow>
                            </div>
                        </S.BulkDiscountBody>
                        <S.BulkDiscountFooter>
                            <S.BulkDiscountCancelBtn type="button" onClick={() => setBulkDiscountOpen(false)}>
                                Anuluj
                            </S.BulkDiscountCancelBtn>
                            <S.BulkDiscountApplyBtn
                                type="button"
                                onClick={applyBulkDiscount}
                                disabled={!bulkDiscountValue || parseFloat(bulkDiscountValue.replace(',', '.')) <= 0}
                            >
                                Zastosuj
                            </S.BulkDiscountApplyBtn>
                        </S.BulkDiscountFooter>
                    </S.BulkDiscountCard>
                </S.BulkDiscountOverlay>
            )}

            {/* Edit service modal */}
            {editModalServiceId && editService && (
                <S.BulkDiscountOverlay onClick={() => setEditModalServiceId(null)}>
                    <S.BulkDiscountCard onClick={(e) => e.stopPropagation()}>
                        <S.BulkDiscountHeader>
                            <div>
                                <S.BulkDiscountTitle>{editGoesToCatalog ? 'Zmień w cenniku' : 'Edytuj usługę'}</S.BulkDiscountTitle>
                                <S.DiscountModalServiceName>{editService.serviceName}</S.DiscountModalServiceName>
                            </div>
                            <S.CloseIconButton
                                type="button"
                                onClick={() => setEditModalServiceId(null)}
                            >
                                <IconX />
                            </S.CloseIconButton>
                        </S.BulkDiscountHeader>
                        <S.BulkDiscountBody>
                            {editGoesToCatalog ? (
                                <Notice tone="warn" title="Zmiana dla wszystkich kolejnych klientów">
                                    Nowa nazwa i cena trafią do cennika i będą podpowiadane przy każdej kolejnej
                                    rezerwacji i wizycie. Ta pozycja też je dostanie, a zapisane wcześniej
                                    rezerwacje i wizyty zostają przy swojej cenie. Żeby zmienić cenę tylko tutaj,
                                    kliknij cenę w wierszu.
                                </Notice>
                            ) : (
                                <Notice tone="info">
                                    Tej usługi nie ma w cenniku, więc zmiana dotyczy tylko {scope.of}.
                                </Notice>
                            )}
                            <div>
                                <S.DiscountSectionLabel>Nazwa</S.DiscountSectionLabel>
                                <S.EditNameInput
                                    value={editName}
                                    onChange={(e) => { setEditName(capitalizeFirst(e.target.value)); setEditError(''); }}
                                    placeholder="Nazwa usługi"
                                    autoFocus
                                />
                            </div>
                            {!editService.requireManualPrice && (
                                <div>
                                    <S.DiscountSectionLabel>Cena</S.DiscountSectionLabel>
                                    <S.EditPriceGrid>
                                        <S.EditPriceField>
                                            <S.EditPriceFieldLabel>Netto (zł)</S.EditPriceFieldLabel>
                                            <S.EditPriceInput
                                                type="text"
                                                inputMode="decimal"
                                                value={editNetInput}
                                                onChange={(e) => handleEditNetChange(e.target.value)}
                                                onKeyDown={handleZeroAwareKeyDown(editNetInput, handleEditNetChange)}
                                            />
                                        </S.EditPriceField>
                                        <S.EditPriceField>
                                            <S.EditPriceFieldLabel>Brutto (zł)</S.EditPriceFieldLabel>
                                            <S.EditPriceInput
                                                type="text"
                                                inputMode="decimal"
                                                value={editGrossInput}
                                                onChange={(e) => handleEditGrossChange(e.target.value)}
                                                onKeyDown={handleZeroAwareKeyDown(editGrossInput, handleEditGrossChange)}
                                            />
                                        </S.EditPriceField>
                                    </S.EditPriceGrid>
                                    <S.EditVatInfo>
                                        VAT: {VAT_LABEL(editService.vatRate)} (nie można zmienić podczas edycji)
                                    </S.EditVatInfo>
                                </div>
                            )}
                            {editError && <S.EditErrorMsg>{editError}</S.EditErrorMsg>}
                        </S.BulkDiscountBody>
                        <S.BulkDiscountFooter>
                            <S.BulkDiscountCancelBtn
                                type="button"
                                onClick={() => setEditModalServiceId(null)}
                            >
                                Anuluj
                            </S.BulkDiscountCancelBtn>
                            <S.EditSaveBtn
                                type="button"
                                onClick={saveEditService}
                                disabled={editSaving}
                            >
                                {editSaving ? 'Zapisywanie…' : editGoesToCatalog ? 'Zapisz w cenniku' : 'Zapisz'}
                            </S.EditSaveBtn>
                        </S.BulkDiscountFooter>
                    </S.BulkDiscountCard>
                </S.BulkDiscountOverlay>
            )}
        </>
    );
};
