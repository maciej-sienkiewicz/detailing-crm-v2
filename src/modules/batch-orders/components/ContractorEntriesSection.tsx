import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useContractorEntries, useCreateEntry, useUpdateEntry, useDeleteEntry, useSettle } from '../hooks/useBatchOrders';
import { EntryFormModal } from './EntryFormModal';
import { DateRangeFilter, currentMonthRange } from './DateRangeFilter';
import { BatchOrderPhotoSection } from './BatchOrderPhotoSection';
import { SettlementModal } from './SettlementModal';
import { SettlementHistoryModal } from './SettlementHistoryModal';
import { useQuery } from '@tanstack/react-query';
import { batchOrderApi } from '../api/batchOrderApi';
import type { BatchContractor, BatchOrderEntry, EntryRequest, SettlementRequest } from '../types';

const Section = styled.div`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 12px;
    overflow: hidden;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* Wcięcie zgodne z tabelą (20px), żeby nazwa kontrahenta stała w jednej
       linii z kolumną „Data" poniżej. */
    padding: 14px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    /* Biel karty, nie szarość tła strony: wyciszone przyciski mają tło
       surfaceAlt i na szarym nagłówku były od niego nie do odróżnienia. */
    background: ${p => p.theme.colors.surface};
    gap: 12px;
    flex-wrap: wrap;
`;

const ContractorName = styled.h3`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.md};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

/**
 * „Edytuj" i „Usuń" działają na kontrahencie, a nie na liście wpisów, więc stoją
 * przy jego nazwie - a nie w rzędzie akcji po prawej, gdzie sąsiadowały
 * z „Dodaj wpis" i „Rozlicz" i wyglądały jak operacje na wpisach.
 */
const ContractorTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
`;

const TitleIconBtn = styled.button<{ $danger?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
    -webkit-tap-highlight-color: transparent;

    svg { width: 15px; height: 15px; }

    &:hover {
        background: ${p => p.$danger ? p.theme.colors.errorLight : p.theme.colors.surfaceAlt};
        color: ${p => p.$danger ? p.theme.colors.error : p.theme.colors.text};
    }

    /* Na telefonie ikony są jedynym wejściem do tych akcji, więc dostają
       pełny target dotykowy. */
    @media (hover: none) and (pointer: coarse) {
        width: 36px;
        height: 36px;
        svg { width: 17px; height: 17px; }
    }
`;

const ContractorMeta = styled.div`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    margin-top: 2px;
`;

const HeaderActions = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
`;

const FilterRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    flex-wrap: wrap;
`;

/**
 * "Pokaż rozliczone" sits in the filter row rather than the header: it narrows what
 * the list shows, exactly like the date range next to it, and grouping it with the
 * buttons that *act* on the list would suggest it does something to the entries.
 */
const SettledToggle = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    margin-left: auto;

    @media (max-width: 639px) {
        margin-left: 0;
        width: 100%;
    }

    input {
        width: 16px;
        height: 16px;
        accent-color: ${p => p.theme.colors.primary};
        cursor: pointer;
        flex-shrink: 0;

        @media (hover: none) and (pointer: coarse) {
            width: 20px;
            height: 20px;
        }
    }
`;

const SettledCount = styled.span`
    font-variant-numeric: tabular-nums;
    color: ${p => p.theme.colors.textMuted};
`;

const SettledBadge = styled.span`
    display: inline-block;
    margin-left: 6px;
    padding: 1px 7px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #15803d;
    background: rgba(34, 197, 94, 0.13);
    border: 1px solid rgba(34, 197, 94, 0.28);
    white-space: nowrap;
`;

/**
 * Metryka i warianty wzięte z SharedButton (rozmiar „sm"): 13px, 7/16px,
 * promień 8px. Wcześniej przyciski miały 12px i 5/12px z obramowaniem na
 * każdym z nich - rząd sześciu ramek obok siebie czytał się jak pasek
 * narzędzi doklejony do karty, a nie jak część tego samego widoku co tabela.
 * Teraz akcję niesie wypełnienie, nie kontur: jedna akcja główna (primary),
 * jedna potwierdzająca (success) i reszta wyciszona (secondary).
 */
const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' | 'outline' | 'ghost' | 'success'; $mobileHide?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    line-height: 1.2;
    cursor: pointer;
    white-space: nowrap;
    transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease;
    min-height: 34px;

    @media (hover: none) and (pointer: coarse) {
        min-height: 40px;
        padding: 9px 16px;
    }

    @media (max-width: 639px) {
        display: ${p => p.$mobileHide ? 'none' : undefined};
    }

    &:disabled { opacity: 0.55; cursor: not-allowed; }

    ${p => p.$variant === 'primary' && `
        background: #0ea5e9;
        color: #fff;
        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);
        &:hover:not(:disabled) { background: #0284c7; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.36); }
    `}
    ${p => p.$variant === 'success' && `
        background: #f0fdf4;
        color: #15803d;
        box-shadow: inset 0 0 0 1px #bbf7d0;
        &:hover:not(:disabled) { background: #dcfce7; box-shadow: inset 0 0 0 1px #86efac; }
    `}
    ${p => p.$variant === 'danger' && `
        background: ${p.theme.colors.surfaceAlt};
        color: ${p.theme.colors.textSecondary};
        &:hover:not(:disabled) { background: ${p.theme.colors.errorLight}; color: ${p.theme.colors.error}; }
    `}
    ${p => (!p.$variant || p.$variant === 'outline' || p.$variant === 'ghost') && `
        background: ${p.theme.colors.surfaceAlt};
        color: ${p.theme.colors.textSecondary};
        &:hover:not(:disabled) { background: #e2e8f0; color: ${p.theme.colors.text}; }
    `}
`;

/* ── Mobile overflow menu ── */

const MoreActionsTrigger = styled.button<{ $active?: boolean }>`
    display: none;

    @media (max-width: 639px) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        min-height: 40px;
        border-radius: 7px;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        border: 1px solid ${p => p.$active ? p.theme.colors.primary : p.theme.colors.border};
        background: ${p => p.$active ? p.theme.colors.primary + '18' : 'transparent'};
        color: ${p => p.$active ? p.theme.colors.primary : p.theme.colors.textMuted};
        transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
    }
`;

const MobileSecondaryPanel = styled.div<{ $open: boolean }>`
    display: none;

    @media (max-width: 639px) {
        display: ${p => p.$open ? 'flex' : 'none'};
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px 18px;
        border-bottom: 1px solid ${p => p.theme.colors.border};
        background: ${p => p.theme.colors.surfaceAlt};
    }
`;

/* ── Table ── */
const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto;

    /* Na telefonie siedem kolumn nie ma jak się zmieścić - zamiast przewijania
       w poziomie każdy wpis staje się kartą. Zmiana jest czysto prezentacyjna:
       znaczniki tabeli zostają, więc nic nie traci semantyki ani zachowania. */
    @media (max-width: 767px) {
        overflow-x: visible;
    }
`;

const Table = styled.table`
    width: 100%;
    min-width: 680px;
    border-collapse: collapse;
    background: ${p => p.theme.colors.surface};

    @media (max-width: 767px) {
        display: block;
        min-width: 0;
        tbody { display: block; }
    }
`;

const TableHead = styled.thead`
    background: ${p => p.theme.colors.surfaceAlt};
    border-bottom: 1px solid ${p => p.theme.colors.border};

    /* Nagłówki kolumn zastępują etykiety przy polach w karcie. */
    @media (max-width: 767px) {
        display: none;
    }
`;

const Th = styled.th<{ $align?: 'left' | 'right' | 'center' }>`
    /* Metryka nagłówka wzięta z tabeli Leadów: 11px semibold, 0.05em,
       oddech 12/20px. Wcześniejsze 10px i 8px sprawiały, że nagłówek
       zlewał się z treścią zamiast ją porządkować. */
    padding: 12px 20px;
    text-align: ${p => p.$align ?? 'left'};
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
`;

const Tr = styled.tr<{ $closed?: boolean }>`
    /* Linia w kolorze surfaceAlt, nie border: wiersze mają się rozdzielać,
       a nie być kratkownicą. Tak samo jak w tabeli Leadów. */
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    transition: background ${p => p.theme.transitions.fast};
    background: ${p => p.$closed ? 'rgba(34, 197, 94, 0.05)' : 'transparent'};

    &:last-child { border-bottom: none; }
    &:hover { background: ${p => p.$closed ? 'rgba(34, 197, 94, 0.09)' : p.theme.colors.surfaceHover}; }

    @media (max-width: 767px) {
        /* data | pojazd | usługi | netto | brutto | uwagi | menu
           układane w dwie kolumny: treść i wąska kolumna akcji. */
        display: grid;
        grid-template-columns: minmax(0, 1fr) 34px;
        /* Bez tego wiersz z datą rozciąga się do wysokości przycisku ⋮
           i zostawia pustą przerwę nad marką pojazdu. */
        align-items: start;
        gap: 2px 8px;
        padding: 10px 14px 12px;
    }
`;

const Td = styled.td<{ $align?: 'left' | 'right' | 'center' }>`
    padding: 12px 20px;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    vertical-align: middle;
    text-align: ${p => p.$align ?? 'left'};

    @media (max-width: 767px) {
        display: block;
        padding: 2px 0;
        text-align: left;
        grid-column: 1;

        /* Kwoty dostają etykietę, bo bez nagłówka tabeli sama liczba nie mówi,
           czy to netto czy brutto. */
        &[data-label]::before {
            content: attr(data-label);
            display: inline-block;
            min-width: 52px;
            margin-right: 6px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: ${p => p.theme.colors.textMuted};
        }

        /* Menu ⋮ wraca do prawej krawędzi karty i obejmuje jej pierwszy wiersz. */
        &[data-cell='menu'] {
            grid-column: 2;
            /* Przez dwa wiersze, nie jeden: przycisk ma 44px targetu dotykowego,
               więc sam w wierszu z datą (24px) zostawiał pod nią 20px pustki. */
            grid-row: 1 / span 2;
            justify-self: end;
            align-self: start;
            padding: 0;
        }

        /* Pusta komórka uwag nie zostawia wiersza z samym myślnikiem. */
        &[data-empty='true'] { display: none; }
    }
`;

/* ── Vehicle cell ── */
const VehicleCell = styled.div`
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    line-height: 1.4;
    color: ${p => p.theme.colors.text};
`;

const PlateTag = styled.span`
    display: inline-block;
    margin-top: 3px;
    padding: 3px 8px;
    background: #1e293b;
    color: #e2e8f0;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    line-height: 1.5;
`;

const VinTag = styled.span`
    display: inline-block;
    margin-top: 2px;
    margin-left: 6px;
    padding: 2px 7px;
    background: ${p => p.theme.colors.surfaceAlt};
    color: ${p => p.theme.colors.textMuted};
    border-radius: 5px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    line-height: 1.6;
`;

/* ── Services list ── */
const ServiceList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;

    /* Nazwa nad ceną, nie obok: cena dociśnięta do prawej krawędzi wąskiej
       kolumny odjeżdżała od usługi, do której należy, a przy dwóch pozycjach
       nie było już wiadomo, co z czym. Ten sam układ „tytuł + podtytuł" co
       kontakt w tabeli Leadów. */
    li {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }
`;

const ServiceName = styled.span`
    font-size: 13px;
    color: ${p => p.theme.colors.text};
    font-weight: ${p => p.theme.fontWeights.medium};
    line-height: 1.35;
`;

const ServicePrice = styled.span`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

/* ── Money values ── */
const Money = styled.span`
    font-weight: ${p => p.theme.fontWeights.medium};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
`;

/* Brutto to kwota, po której skanuje się tabelę - jedyna w wierszu pisana
   pełnym kontrastem, jak „wartość" leada. */
const GrossMoney = styled(Money)`
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
`;

/* ── Notes cell ── */
const NoteText = styled.span`
    display: block;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: ${p => p.theme.colors.textMuted};
`;

/* ── Three-dots trigger ── */
const DotsBtn = styled.button<{ $open?: boolean }>`
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid ${p => p.$open ? p.theme.colors.border : 'transparent'};
    background: ${p => p.$open ? p.theme.colors.surfaceAlt : 'transparent'};
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    line-height: 1;
    opacity: ${p => p.$open ? 1 : 0};
    transition: background 120ms ease, border-color 120ms ease, opacity 120ms ease, color 120ms ease;
    /* Expand tap target without changing visual size */
    position: relative;

    ${Tr}:hover & { opacity: 1; }

    &:hover {
        background: ${p => p.theme.colors.surfaceAlt};
        border-color: ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.text};
    }

    @media (hover: none) and (pointer: coarse) {
        /* Always visible on touch; tap target 44px via padding */
        opacity: 1;
        width: 44px;
        height: 44px;
    }
`;

/* ── Portal dropdown ── */
const DropdownMenu = styled.div`
    position: fixed;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
    z-index: 9999;
    min-width: 172px;
    max-width: calc(100vw - 16px);
    padding: 4px;
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
    width: 100%;
    padding: 7px 10px;
    text-align: left;
    background: transparent;
    border: none;
    border-radius: 5px;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    color: ${p => p.$danger ? p.theme.colors.error : p.theme.colors.text};
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 100ms ease;

    &:hover {
        background: ${p => p.$danger ? 'rgba(239,68,68,0.08)' : p.theme.colors.surfaceAlt};
    }
`;

const MenuDivider = styled.div`
    height: 1px;
    background: ${p => p.theme.colors.border};
    margin: 3px 0;
`;

/* ── Summary footer ── */
const SummaryBar = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    @media (max-width: 767px) {
        flex-wrap: nowrap;
    }
    background: ${p => p.theme.colors.surfaceAlt};
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const SummaryItem = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    /* Stopka czyta się jak drugi nagłówek tabeli, więc bierze jego wcięcie.
       Pionowe kreski między pozycjami zniknęły - odstęp wystarcza, a kreski
       robiły z podsumowania kratkownicę obcą reszcie widoku. */
    padding: 12px 20px;

    & + & { padding-left: 0; }

    /* Trzy pozycje w jednym rzędzie zamiast łamania się „2 + 1” z nierówną
       ostatnią komórką na całą szerokość. */
    @media (max-width: 767px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        flex: 1;
        min-width: 0;
        padding: 9px 10px;
    }
`;

const SummaryLabel = styled.span`
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${p => p.theme.colors.textMuted};
`;

const SummaryValue = styled.span`
    font-size: 14px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;

    @media (max-width: 767px) {
        font-size: 14px;
    }
`;

/* ── Empty / loading ── */
const EmptyRow = styled.div`
    padding: 28px 20px;
    text-align: center;
    color: ${p => p.theme.colors.textMuted};
    font-size: ${p => p.theme.fontSizes.sm};
`;

function formatMoney(cents: number) {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);
}

function vatLabel(rate: number) {
    if (rate === -1) return 'ZW';
    return `${rate}%`;
}

interface MenuPosition { top: number; right: number; }

interface Props {
    contractor: BatchContractor;
    onEdit: () => void;
    onDelete: () => void;
}

export function ContractorEntriesSection({ contractor, onEdit, onDelete }: Props) {
    const initial = currentMonthRange();
    const [filterFrom, setFilterFrom] = useState(initial.from);
    const [filterTo, setFilterTo] = useState(initial.to);
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [editEntry, setEditEntry] = useState<BatchOrderEntry | null>(null);
    const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [expandedPhotoEntryId, setExpandedPhotoEntryId] = useState<string | null>(null);
    const [showSettlement, setShowSettlement] = useState(false);
    // Off by default: a settled entry is finished business, and months of finished work
    // above the two entries still waiting is the reason this list stopped being usable.
    const [showSettled, setShowSettled] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
    const [showMoreActions, setShowMoreActions] = useState(false);

    useEffect(() => {
        if (!openMenuEntryId) return;
        function close() { setOpenMenuEntryId(null); setMenuPosition(null); }
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [openMenuEntryId]);

    const { data, isLoading, isError } = useContractorEntries(
        contractor.id,
        filterFrom || undefined,
        filterTo || undefined,
        showSettled,
    );
    const createEntry = useCreateEntry(contractor.id);
    const updateEntry = useUpdateEntry(contractor.id);
    const deleteEntry = useDeleteEntry(contractor.id);
    const settle = useSettle(contractor.id);

    function openMenu(e: React.MouseEvent<HTMLButtonElement>, entryId: string) {
        e.stopPropagation();
        if (openMenuEntryId === entryId) {
            setOpenMenuEntryId(null);
            setMenuPosition(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const vpWidth = window.visualViewport?.width ?? window.innerWidth;
        setMenuPosition({
            top: rect.bottom + 4,
            right: Math.max(8, vpWidth - rect.right),
        });
        setOpenMenuEntryId(entryId);
    }

    async function handleSaveEntry(req: EntryRequest) {
        if (editEntry) {
            await updateEntry.mutateAsync({ entryId: editEntry.id, data: req });
        } else {
            await createEntry.mutateAsync(req);
        }
    }

    async function handleDownloadReport() {
        setDownloading(true);
        try {
            await batchOrderApi.downloadReport(
                contractor.id,
                contractor.name,
                filterFrom || undefined,
                filterTo || undefined
            );
        } finally {
            setDownloading(false);
        }
    }

    async function handleSettle(request: SettlementRequest) {
        await settle.mutateAsync(request);
        setShowSettlement(false);
    }

    const entries = data?.entries ?? [];
    const summary = data?.summary;
    const openEntry = entries.find(e => e.id === openMenuEntryId) ?? null;
    // Counted server-side over the whole period, so it stays right while the list hides
    // the very entries it is counting.
    const settledCount = data?.settledCount ?? 0;
    const hasPartialSettlement = settledCount > 0;

    // Historia rozliczeń mówi, czy zestawienie za ten okres poszło już e-mailem -
    // modal ostrzega wtedy przed drugą wysyłką w trybie „Wszystkie" (nie blokuje).
    const { data: settlementHistory } = useQuery({
        queryKey: ['settlement-history', contractor.id],
        queryFn: () => batchOrderApi.getSettlementHistory(contractor.id),
        enabled: showSettlement,
    });
    const emailedCloses = (settlementHistory ?? [])
        .filter(r => r.emailSent && r.periodFrom && r.periodTo && r.periodFrom <= filterTo && r.periodTo >= filterFrom)
        .map(r => r.closedAt)
        .sort();
    const previousEmailSentAt = emailedCloses.length > 0 ? emailedCloses[emailedCloses.length - 1] : null;

    return (
        <>
            <Section>
                <SectionHeader>
                    <div>
                        <ContractorTitleRow>
                            <ContractorName>{contractor.name}</ContractorName>
                            <TitleIconBtn onClick={onEdit} title="Edytuj kontrahenta" aria-label="Edytuj kontrahenta">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                            </TitleIconBtn>
                            <TitleIconBtn $danger onClick={onDelete} title="Usuń kontrahenta" aria-label="Usuń kontrahenta">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                                    <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                                </svg>
                            </TitleIconBtn>
                        </ContractorTitleRow>
                        <ContractorMeta>
                            {contractor.taxId && `NIP: ${contractor.taxId}`}
                            {contractor.taxId && contractor.contactPersonName && ' · '}
                            {contractor.contactPersonName}
                            {contractor.phone && ` · ${contractor.phone}`}
                        </ContractorMeta>
                    </div>
                    <HeaderActions>
                        <ActionBtn $mobileHide $variant="ghost" onClick={handleDownloadReport} disabled={downloading}>
                            {downloading ? 'Generowanie…' : (
                                <>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    PDF
                                </>
                            )}
                        </ActionBtn>
                        <ActionBtn $mobileHide $variant="ghost" onClick={() => setShowHistory(true)} title="Historia rozliczeń">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Historia
                        </ActionBtn>
                        <ActionBtn $variant="success" onClick={() => setShowSettlement(true)}>
                            Rozlicz
                        </ActionBtn>
                        <ActionBtn $variant="primary" onClick={() => { setEditEntry(null); setShowEntryForm(true); }}>
                            + Dodaj wpis
                        </ActionBtn>
                        <MoreActionsTrigger
                            $active={showMoreActions}
                            onClick={() => setShowMoreActions(v => !v)}
                            title={showMoreActions ? 'Ukryj opcje' : 'Więcej opcji'}
                        >
                            {showMoreActions ? '✕' : '⋯'}
                        </MoreActionsTrigger>
                    </HeaderActions>
                </SectionHeader>

                <MobileSecondaryPanel $open={showMoreActions}>
                    {/* Bez „Edytuj" i „Usuń" - te siedzą teraz przy nazwie kontrahenta
                        i są na telefonie widoczne od razu, bez rozwijania. */}
                    <ActionBtn $variant="ghost" onClick={handleDownloadReport} disabled={downloading}>
                        {downloading ? 'Generowanie…' : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                PDF
                            </>
                        )}
                    </ActionBtn>
                    <ActionBtn $variant="ghost" onClick={() => setShowHistory(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Historia
                    </ActionBtn>
                </MobileSecondaryPanel>

                <FilterRow>
                    <DateRangeFilter
                        from={filterFrom}
                        to={filterTo}
                        onChange={(f, t) => { setFilterFrom(f); setFilterTo(t); }}
                    />
                    <SettledToggle>
                        <input
                            type="checkbox"
                            checked={showSettled}
                            onChange={e => setShowSettled(e.target.checked)}
                        />
                        Pokaż rozliczone
                        {settledCount > 0 && <SettledCount>({settledCount})</SettledCount>}
                    </SettledToggle>
                </FilterRow>

                {isLoading ? (
                    <EmptyRow>Ładowanie...</EmptyRow>
                ) : isError ? (
                    <EmptyRow>Błąd ładowania danych</EmptyRow>
                ) : entries.length === 0 ? (
                    <EmptyRow>
                        {settledCount > 0 && !showSettled
                            ? `Wszystkie wpisy z tego okresu są już rozliczone (${settledCount}). Zaznacz „Pokaż rozliczone", aby je zobaczyć.`
                            : `Brak wpisów${(filterFrom || filterTo) ? ' dla wybranego okresu' : '. Dodaj pierwszy wpis używając przycisku powyżej.'}`}
                    </EmptyRow>
                ) : (
                    <>
                        <TableWrapper>
                            <Table>
                                <TableHead>
                                    <tr>
                                        <Th>Data</Th>
                                        <Th>Pojazd</Th>
                                        <Th>Usługi</Th>
                                        <Th $align="right">Netto</Th>
                                        <Th $align="right">Brutto</Th>
                                        <Th>Uwagi</Th>
                                        <Th style={{ width: 40 }}></Th>
                                    </tr>
                                </TableHead>
                                <tbody>
                                    {entries.map(entry => (
                                        <Fragment key={entry.id}>
                                            <Tr $closed={entry.isClosed}>
                                                <Td style={{ whiteSpace: 'nowrap' }}>
                                                    {new Date(entry.serviceDate).toLocaleDateString('pl-PL')}
                                                    {entry.isClosed && <SettledBadge>Rozliczone</SettledBadge>}
                                                </Td>
                                                <Td>
                                                    <VehicleCell>
                                                        {[entry.vehicleMake, entry.vehicleModel].filter(Boolean).join(' ') || '-'}
                                                    </VehicleCell>
                                                    {(entry.vehicleLicensePlate || entry.vehicleVin) && (
                                                        <div>
                                                            {entry.vehicleLicensePlate && (
                                                                <PlateTag>{entry.vehicleLicensePlate}</PlateTag>
                                                            )}
                                                            {entry.vehicleVin && (
                                                                <VinTag>VIN {entry.vehicleVin}</VinTag>
                                                            )}
                                                        </div>
                                                    )}
                                                </Td>
                                                <Td>
                                                    {entry.services.length > 0 ? (
                                                        <ServiceList>
                                                            {entry.services.map((s, i) => (
                                                                <li key={i}>
                                                                    <ServiceName>{s.name}</ServiceName>
                                                                    <ServicePrice>
                                                                        {formatMoney(s.netAmountCents)} / {formatMoney(s.grossAmountCents)} {vatLabel(s.vatRate)}
                                                                    </ServicePrice>
                                                                </li>
                                                            ))}
                                                        </ServiceList>
                                                    ) : '-'}
                                                </Td>
                                                <Td $align="right" data-label="Netto">
                                                    <Money>{formatMoney(entry.netAmountCents)}</Money>
                                                </Td>
                                                <Td $align="right" data-label="Brutto">
                                                    <GrossMoney>{formatMoney(entry.grossAmountCents)}</GrossMoney>
                                                </Td>
                                                <Td data-empty={!entry.notes}>
                                                    <NoteText title={entry.notes ?? undefined}>
                                                        {entry.notes || '-'}
                                                    </NoteText>
                                                </Td>
                                                <Td style={{ width: 40, paddingLeft: 4 }} data-cell="menu">
                                                    <DotsBtn
                                                        $open={openMenuEntryId === entry.id}
                                                        onClick={e => openMenu(e, entry.id)}
                                                        title="Opcje"
                                                    >
                                                        ⋮
                                                    </DotsBtn>
                                                </Td>
                                            </Tr>
                                            {expandedPhotoEntryId === entry.id && (
                                                <tr>
                                                    <td colSpan={7} style={{ padding: 0 }}>
                                                        <BatchOrderPhotoSection entryId={entry.id} />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </Table>
                        </TableWrapper>

                        {summary && (
                            <SummaryBar>
                                <SummaryItem>
                                    <SummaryLabel>Wpisów</SummaryLabel>
                                    <SummaryValue>{summary.entryCount}</SummaryValue>
                                </SummaryItem>
                                <SummaryItem>
                                    <SummaryLabel>Netto</SummaryLabel>
                                    <SummaryValue>{formatMoney(summary.totalNetCents)}</SummaryValue>
                                </SummaryItem>
                                <SummaryItem>
                                    <SummaryLabel>Brutto</SummaryLabel>
                                    <SummaryValue>{formatMoney(summary.totalGrossCents)}</SummaryValue>
                                </SummaryItem>
                            </SummaryBar>
                        )}
                    </>
                )}
            </Section>

            {/* Portal dropdown: renders into document.body, escapes all overflow:hidden parents */}
            {openEntry && menuPosition && createPortal(
                <DropdownMenu
                    style={{ top: menuPosition.top, right: menuPosition.right }}
                    onClick={e => e.stopPropagation()}
                >
                    <MenuItem
                        onClick={() => {
                            setExpandedPhotoEntryId(
                                expandedPhotoEntryId === openEntry.id ? null : openEntry.id
                            );
                            setOpenMenuEntryId(null);
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                        Dokumentacja zdjęciowa
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            setEditEntry(openEntry);
                            setShowEntryForm(true);
                            setOpenMenuEntryId(null);
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edytuj wpis
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem
                        $danger
                        onClick={() => {
                            setConfirmDeleteEntryId(openEntry.id);
                            setOpenMenuEntryId(null);
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                        Usuń wpis
                    </MenuItem>
                </DropdownMenu>,
                document.body
            )}

            {showEntryForm && (
                <EntryFormModal
                    initial={editEntry}
                    onSave={handleSaveEntry}
                    onClose={() => { setShowEntryForm(false); setEditEntry(null); }}
                />
            )}

            <ConfirmationModal
                isOpen={confirmDeleteEntryId !== null}
                title="Usuń wpis"
                message="Czy na pewno chcesz usunąć ten wpis? Operacja jest nieodwracalna."
                variant="danger"
                confirmText="Usuń"
                cancelText="Anuluj"
                onConfirm={() => { if (confirmDeleteEntryId) deleteEntry.mutateAsync(confirmDeleteEntryId); }}
                onCancel={() => setConfirmDeleteEntryId(null)}
            />

            {showSettlement && (
                <SettlementModal
                    contractor={contractor}
                    from={filterFrom}
                    to={filterTo}
                    hasPartialSettlement={hasPartialSettlement}
                    previousEmailSentAt={previousEmailSentAt}
                    onConfirm={handleSettle}
                    onClose={() => setShowSettlement(false)}
                    isLoading={settle.isPending}
                />
            )}

            {showHistory && (
                <SettlementHistoryModal
                    contractor={contractor}
                    onClose={() => setShowHistory(false)}
                />
            )}
        </>
    );
}
