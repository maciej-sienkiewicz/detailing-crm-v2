// src/modules/batch-orders/components/ContractorDetail.tsx
//
// Wybrany kontrahent: kto to jest, ile ma do rozliczenia w okresie, i jego wpisy.
//
// Kwota „do rozliczenia" jest nagłówkiem sekcji, a nie stopką tabeli - to po nią się
// tu wraca, a stopka pod długą listą wymagała przewinięcia całości. Rozpisanie na
// wpisy jest dowodem pod nią.
//
// Jedna wypełniona rzecz w oknie: „Dodaj wpis" (CLAUDE.md §2). „Rozlicz okres" nosi
// zieleń jako tło i obwódkę - ważne, ale robione raz w miesiącu.

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import {
    ArrowRight, Building2, Check, Clock, Download, Info, MoreHorizontal, Pencil, Plus, Search, Trash2,
} from 'lucide-react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { useContainerWidth } from '@/common/hooks';
import { batchOrderApi } from '../api/batchOrderApi';
import { useContractorEntries, useDeleteEntry, useReopenEntry } from '../hooks/useBatchOrders';
import type { BatchContractor, BatchOrderEntry, EntryStatusFilter } from '../types';
import { apiErrorMessage, entriesLabel, formatMoney, vehicleName } from '../utils/format';
import { formatDay, formatInstantDay, periodPhrase, type Period } from '../utils/period';
import { EntriesTable, type EntryFocus } from './EntriesTable';
import { EntryDrawer } from './EntryDrawer';
import { SettlementHistoryModal } from './SettlementHistoryModal';
import { SettlementModal } from './SettlementModal';

// ─── Karta ────────────────────────────────────────────────────────────────────

/**
 * Jedyna wyniesiona powierzchnia w kolumnie treści (CLAUDE.md §2, „wyniesienie").
 *
 * Układ wnętrza zależy od szerokości KARTY (zapytania kontenerowe), nie okna: obok
 * rozwiniętego paska bocznego i listy kontrahentów karta ma realnie połowę ekranu,
 * a `@media` dalej twierdziło, że jest szeroko - nazwa łamała się po jednym słowie.
 */
const Card = styled.section`
    container: detail / inline-size;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: ${p => p.theme.colors.surface};
    border-radius: 20px;
    border-top: 4px solid #0ea5e9;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 16px 40px rgba(15, 23, 42, 0.08);
    overflow: hidden;

    @media (max-width: 767px) { border-radius: 18px; }
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 28px 0;

    @container detail (max-width: 760px) { flex-wrap: wrap; align-items: flex-start; }
    @container detail (max-width: 560px) { padding: 16px 16px 0; flex-wrap: nowrap; }
`;

const Identity = styled.div`
    flex: 1 1 280px;
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
`;

const IconTile = styled.div`
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: #e0f2fe;
    color: #0369a1;

    svg { width: 20px; height: 20px; }
    @container detail (max-width: 560px) { display: none; }
`;

const NameBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const Name = styled.h2`
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${p => p.theme.colors.text};
    overflow-wrap: break-word;

    @container detail (max-width: 560px) { font-size: 17px; }
`;

const Meta = styled.span`
    font-size: 13px;
    color: #64748b;
    overflow-wrap: break-word;
`;

const HeadActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const GhostBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 38px;
    padding: 0 14px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.surface};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    white-space: nowrap;
    cursor: pointer;

    svg { width: 15px; height: 15px; flex-shrink: 0; }
    &:hover:not(:disabled) { border-color: #94a3b8; color: ${p => p.theme.colors.text}; }
    &:disabled { opacity: 0.6; cursor: progress; }
`;

const IconBtn = styled(GhostBtn)`
    width: 38px;
    padding: 0;
    justify-content: center;

    svg { width: 17px; height: 17px; }
    @media (hover: none) and (pointer: coarse) { width: 44px; height: 44px; }
`;

// ─── Kwota ────────────────────────────────────────────────────────────────────

const Hero = styled.div`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    padding: 16px 28px 22px;
    border-bottom: 1px solid #eef2f7;

    @container detail (max-width: 900px) { flex-direction: column; align-items: stretch; gap: 16px; }
    @container detail (max-width: 560px) { padding: 12px 16px 16px; }
`;

const HeroText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const HeroLabel = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
`;

const HeroAmount = styled.span`
    font-size: 40px;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;

    @container detail (max-width: 560px) { font-size: 30px; }
`;

const HeroMeta = styled.span`
    font-size: 13px;
    line-height: 1.5;
    color: #64748b;
`;

const HeroDone = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #15803d;

    svg { width: 14px; height: 14px; }
`;

const InlineLink = styled.button`
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: inherit;
    font-weight: 600;
    color: #0369a1;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
`;

const HeroActions = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;

    @container detail (max-width: 900px) { > * { flex: 1 1 0; min-width: 0; } }
`;

const SettleBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 52px;
    padding: 0 20px;
    border: 1px solid #86efac;
    border-radius: 14px;
    background: ${p => p.theme.colors.successLight};
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: #15803d;
    white-space: nowrap;
    cursor: pointer;

    svg { width: 16px; height: 16px; }
    &:hover:not(:disabled) { background: #dcfce7; border-color: #4ade80; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/**
 * Jedyny wypełniony element w oknie, więc zbudowany tak, żeby nie dało się go pomylić
 * z „Zapisz": dwie linie (co + dla kogo), kafelek ikony, gradient i cień marki,
 * strzałka reagująca na kursor. Wzorzec: FooterPrimary w LeadDetailModal.
 */
const AddEntryBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    padding: 0 20px 0 10px;
    border: none;
    border-radius: 14px;
    background: linear-gradient(135deg, #0284c7, #075985);
    box-shadow: 0 8px 20px rgba(3, 105, 161, 0.3);
    font-family: inherit;
    color: #fff;
    text-align: left;
    cursor: pointer;
    transition: box-shadow ${p => p.theme.transitions.fast}, transform ${p => p.theme.transitions.fast};

    > svg { width: 16px; height: 16px; margin-left: auto; transition: transform ${p => p.theme.transitions.fast}; }
    &:hover { box-shadow: 0 10px 26px rgba(3, 105, 161, 0.38); }
    &:hover > svg { transform: translateX(3px); }
    &:active { transform: translateY(1px); }

    /* Na wąskiej karcie stoi obok „Rozlicz okres" w połowie szerokości: zostaje
       kafelek i „Dodaj wpis", bez podpisu i strzałki, które wychodziły poza kartę. */
    @container detail (max-width: 560px) {
        height: 52px;
        padding: 0 14px 0 8px;
        gap: 10px;
        > svg { display: none; }
    }
`;

const AddTile = styled.span`
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.18);

    svg { width: 18px; height: 18px; }
`;

const AddText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;

    strong { font-size: 15px; font-weight: 700; white-space: nowrap; }
    span { font-size: 12px; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @container detail (max-width: 560px) { span { display: none; } }
`;

// ─── Pasek nad listą ──────────────────────────────────────────────────────────

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px 28px;

    @container detail (max-width: 560px) { padding: 12px 16px; gap: 10px; }
`;

const SearchBox = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1 1 240px;
    max-width: 380px;
    min-width: 200px;
    height: 40px;
    padding: 0 14px;
    box-sizing: border-box;
    background: ${p => p.theme.colors.surfaceHover};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 12px;
    color: #64748b;

    &:focus-within { border-color: #38bdf8; background: ${p => p.theme.colors.surface}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }
    svg { width: 15px; height: 15px; flex-shrink: 0; }

    input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        font-family: inherit;
        font-size: 16px;
        color: ${p => p.theme.colors.text};
        @media (min-width: 768px) { font-size: 13.5px; }
    }

    @container detail (max-width: 560px) { flex: 1 1 100%; max-width: none; height: 44px; }
`;

const Segmented = styled.div`
    display: flex;
    gap: 2px;
    padding: 3px;
    background: ${p => p.theme.colors.surfaceAlt};
    border-radius: 12px;

    @container detail (max-width: 560px) { flex: 1 1 100%; }
`;

const Segment = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border: none;
    border-radius: 9px;
    background: ${p => p.$active ? p.theme.colors.surface : 'transparent'};
    box-shadow: ${p => p.$active ? '0 1px 2px rgba(15, 23, 42, 0.12)' : 'none'};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.$active ? p.theme.colors.text : p.theme.colors.textSecondary};
    white-space: nowrap;
    cursor: pointer;

    span { font-size: 12px; font-weight: 700; color: ${p => p.$active ? '#0369a1' : '#64748b'}; font-variant-numeric: tabular-nums; }
    @container detail (max-width: 560px) { flex: 1; padding: 0 8px; height: 40px; }
`;

const ToolbarHint = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    font-size: 12.5px;
    color: #64748b;

    svg { width: 14px; height: 14px; flex-shrink: 0; }
    /* Tylko tam, gdzie mieści się w jednym rzędzie z wyszukiwarką i przełącznikiem.
       Na węższej karcie tę samą robotę robią ołówki przy kwotach. */
    @container detail (max-width: 999px) { display: none; }
`;

const Empty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 24px 48px;
    border-top: 1px solid #eef2f7;
    text-align: center;
    font-size: 14px;
    color: ${p => p.theme.colors.textSecondary};

    strong { font-size: 15px; color: ${p => p.theme.colors.text}; }
`;

const TintedBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 40px;
    padding: 0 16px;
    border: 1px solid #7dd3fc;
    border-radius: ${p => p.theme.radii.full};
    background: #f0f9ff;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    color: #075985;
    cursor: pointer;

    svg { width: 15px; height: 15px; }
    &:hover { background: #e0f2fe; }
`;

// ─── Menu kontrahenta ─────────────────────────────────────────────────────────

const Dropdown = styled.div`
    position: fixed;
    z-index: 900;
    min-width: 220px;
    padding: 4px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(15, 23, 42, 0.16);
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 40px;
    padding: 0 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 500;
    text-align: left;
    color: ${p => p.$danger ? '#b91c1c' : p.theme.colors.text};
    cursor: pointer;

    svg { width: 15px; height: 15px; color: ${p => p.$danger ? '#b91c1c' : '#64748b'}; }
    &:hover { background: ${p => p.$danger ? p.theme.colors.errorLight : p.theme.colors.surfaceAlt}; }
    @media (hover: none) and (pointer: coarse) { min-height: 46px; }
`;

const MenuDivider = styled.div`
    height: 1px;
    margin: 4px 2px;
    background: ${p => p.theme.colors.border};
`;

// ─── Component ────────────────────────────────────────────────────────────────

type DrawerState = { entry: BatchOrderEntry | null; focus?: EntryFocus } | null;

const STATUS_LABELS: Record<EntryStatusFilter, string> = {
    OPEN: 'Do rozliczenia',
    SETTLED: 'Rozliczone',
    ALL: 'Wszystkie',
};

function matches(entry: BatchOrderEntry, q: string): boolean {
    const compact = q.replace(/\s+/g, '');
    const haystack = [
        entry.vehicleMake, entry.vehicleModel, entry.notes,
        ...entry.services.map(s => s.name),
    ].filter(Boolean).join(' ').toLowerCase();
    const idents = [entry.vehicleLicensePlate, entry.vehicleVin]
        .filter(Boolean).join(' ').replace(/\s+/g, '').toLowerCase();
    return haystack.includes(q) || (compact.length > 0 && idents.includes(compact));
}

/** Od tej szerokości karty wpisy są tabelą, poniżej - listą jak na telefonie. */
const TABLE_MIN_WIDTH = 640;
/** Od tej szerokości „Historia" i „Zestawienie PDF" stoją w nagłówku, poniżej są w menu ⋯. */
const HEAD_BUTTONS_MIN_WIDTH = 720;

interface Props {
    contractor: BatchContractor;
    period: Period;
    /** Zanim karta zostanie zmierzona - czy okno jest na tyle szerokie, żeby zacząć od tabeli. */
    isDesktop: boolean;
    onEditContractor: () => void;
    onDeleteContractor: () => void;
}

export function ContractorDetail({ contractor, period, isDesktop, onEditContractor, onDeleteContractor }: Props) {
    const { showSuccess, showError } = useToast();
    const [cardRef, cardWidth] = useContainerWidth<HTMLElement>();
    const asTable = cardWidth === null ? isDesktop : cardWidth >= TABLE_MIN_WIDTH;
    const headButtons = cardWidth === null ? isDesktop : cardWidth >= HEAD_BUTTONS_MIN_WIDTH;
    const [status, setStatus] = useState<EntryStatusFilter>('OPEN');
    const [query, setQuery] = useState('');
    const [drawer, setDrawer] = useState<DrawerState>(null);
    const [showSettlement, setShowSettlement] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<BatchOrderEntry | null>(null);
    const [confirmReopen, setConfirmReopen] = useState<BatchOrderEntry | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

    const { data, isLoading, isError, refetch } = useContractorEntries(contractor.id, period.from, period.to, status);
    const deleteEntry = useDeleteEntry(contractor.id);
    const reopenEntry = useReopenEntry(contractor.id);

    useEffect(() => {
        if (!menuPos) return;
        const close = () => setMenuPos(null);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        document.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('click', close);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', close, true);
        };
    }, [menuPos]);

    const entries = useMemo(() => data?.entries ?? [], [data]);
    const q = query.trim().toLowerCase();
    const visible = useMemo(() => (q ? entries.filter(e => matches(e, q)) : entries), [entries, q]);

    const open = data?.openSummary;
    const settled = data?.settledSummary;
    const openCount = open?.entryCount ?? 0;
    const settledCount = settled?.entryCount ?? 0;
    const counts: Record<EntryStatusFilter, number> = { OPEN: openCount, SETTLED: settledCount, ALL: openCount + settledCount };

    const meta = [
        contractor.taxId && `NIP ${contractor.taxId}`,
        contractor.contactPersonName,
        contractor.phone,
    ].filter(Boolean).join(' · ');

    async function handleDownload() {
        setDownloading(true);
        try {
            await batchOrderApi.downloadReport(contractor.id, contractor.name, period.from, period.to, status);
        } catch {
            showError('Nie udało się pobrać zestawienia', 'Spróbuj ponownie za chwilę.');
        } finally {
            setDownloading(false);
        }
    }

    async function handleDelete(entry: BatchOrderEntry) {
        try {
            await deleteEntry.mutateAsync(entry.id);
            showSuccess('Wpis usunięty', `${vehicleName(entry)} · ${formatDay(entry.serviceDate)}`);
        } catch (e) {
            showError('Nie udało się usunąć wpisu', apiErrorMessage(e, 'Spróbuj ponownie.'));
        }
    }

    async function handleReopen(entry: BatchOrderEntry) {
        try {
            const reopened = await reopenEntry.mutateAsync(entry.id);
            showSuccess('Wpis odblokowany', 'Po zapisie wróci do najbliższego rozliczenia jako korekta.');
            setDrawer({ entry: reopened, focus: 'price' });
        } catch (e) {
            showError('Nie udało się odblokować wpisu', apiErrorMessage(e, 'Spróbuj ponownie.'));
        }
    }

    function openMenu(e: React.MouseEvent<HTMLButtonElement>) {
        e.stopPropagation();
        if (menuPos) { setMenuPos(null); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        const vw = window.visualViewport?.width ?? window.innerWidth;
        setMenuPos({ top: rect.bottom + 4, right: Math.max(8, vw - rect.right) });
    }

    const phrase = periodPhrase(period);

    return (
        <Card ref={cardRef} aria-labelledby="contractor-detail-name">
            <Head>
                <Identity>
                    <IconTile><Building2 /></IconTile>
                    <NameBlock>
                        <Name id="contractor-detail-name">{contractor.name}</Name>
                        {meta && <Meta>{meta}</Meta>}
                    </NameBlock>
                </Identity>
                <HeadActions>
                    {headButtons && (
                        <>
                            <GhostBtn type="button" onClick={() => setShowHistory(true)}>
                                <Clock />Historia rozliczeń
                            </GhostBtn>
                            <GhostBtn type="button" onClick={handleDownload} disabled={downloading}>
                                <Download />{downloading ? 'Generowanie…' : 'Zestawienie PDF'}
                            </GhostBtn>
                        </>
                    )}
                    <IconBtn
                        type="button"
                        aria-label="Więcej akcji kontrahenta"
                        aria-haspopup="menu"
                        aria-expanded={!!menuPos}
                        onClick={openMenu}
                    >
                        <MoreHorizontal />
                    </IconBtn>
                </HeadActions>
            </Head>

            <Hero>
                <HeroText>
                    <HeroLabel>Do rozliczenia · {phrase}</HeroLabel>
                    <HeroAmount>{isLoading && !data ? '…' : formatMoney(open?.totalGrossCents ?? 0)}</HeroAmount>
                    {data && (
                        openCount === 0 && settledCount > 0 ? (
                            <HeroDone><Check />Wszystko z tego okresu jest rozliczone</HeroDone>
                        ) : (
                            <HeroMeta>
                                {formatMoney(open?.totalNetCents ?? 0)} netto · {entriesLabel(openCount)}
                                {settledCount > 0 && (
                                    <>
                                        {' · '}rozliczono już {entriesLabel(settledCount)} ({formatMoney(settled?.totalGrossCents ?? 0)}
                                        {data.lastSettledAt ? `, ${formatInstantDay(data.lastSettledAt).slice(0, 5)}` : ''}){' '}
                                        {status !== 'SETTLED' && <InlineLink type="button" onClick={() => setStatus('SETTLED')}>zobacz</InlineLink>}
                                    </>
                                )}
                            </HeroMeta>
                        )
                    )}
                </HeroText>
                <HeroActions>
                    <SettleBtn
                        type="button"
                        onClick={() => setShowSettlement(true)}
                        disabled={openCount === 0}
                        title={openCount === 0 ? 'W tym okresie nie ma nic do rozliczenia' : undefined}
                    >
                        <Check />Rozlicz okres
                    </SettleBtn>
                    <AddEntryBtn type="button" onClick={() => setDrawer({ entry: null })}>
                        <AddTile><Plus /></AddTile>
                        <AddText><strong>Dodaj wpis</strong><span>kolejne auto dla kontrahenta</span></AddText>
                        <ArrowRight />
                    </AddEntryBtn>
                </HeroActions>
            </Hero>

            <Toolbar>
                <SearchBox>
                    <Search />
                    <input
                        aria-label="Szukaj wpisu"
                        placeholder="Szukaj po tablicy, VIN lub usłudze"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </SearchBox>
                <Segmented role="group" aria-label="Status wpisów">
                    {(Object.keys(STATUS_LABELS) as EntryStatusFilter[]).map(s => (
                        <Segment key={s} type="button" $active={status === s} aria-pressed={status === s} onClick={() => setStatus(s)}>
                            {STATUS_LABELS[s]} {data && <span>{counts[s]}</span>}
                        </Segment>
                    ))}
                </Segmented>
                {asTable && visible.length > 0 && (
                    <ToolbarHint><Info />Kliknij wiersz albo kwotę, żeby edytować wpis</ToolbarHint>
                )}
            </Toolbar>

            {isLoading && !data ? (
                <Empty>Wczytywanie wpisów…</Empty>
            ) : isError ? (
                <Empty>
                    <strong>Nie udało się wczytać wpisów</strong>
                    <TintedBtn type="button" onClick={() => refetch()}>Spróbuj ponownie</TintedBtn>
                </Empty>
            ) : visible.length > 0 ? (
                <EntriesTable
                    entries={visible}
                    isDesktop={asTable}
                    onOpen={(entry, focus) => setDrawer({ entry, focus })}
                    onDelete={setConfirmDelete}
                    onReopen={setConfirmReopen}
                />
            ) : q ? (
                <Empty>
                    <strong>Nic nie pasuje do „{query.trim()}"</strong>
                    <span>Szukamy w tablicach, VIN, markach, usługach i uwagach - w zakładce „{STATUS_LABELS[status]}".</span>
                </Empty>
            ) : status === 'OPEN' && settledCount > 0 ? (
                <Empty>
                    <strong>Wszystko z okresu {phrase} jest rozliczone</strong>
                    <TintedBtn type="button" onClick={() => setStatus('SETTLED')}>Pokaż rozliczone ({settledCount})</TintedBtn>
                </Empty>
            ) : status === 'SETTLED' ? (
                <Empty><strong>W okresie {phrase} nic jeszcze nie rozliczono</strong></Empty>
            ) : (
                <Empty>
                    <strong>Brak wpisów w okresie {phrase}</strong>
                    <span>Każde auto zrobione dla tego kontrahenta to jeden wpis. Rozliczysz je razem na koniec okresu.</span>
                    <TintedBtn type="button" onClick={() => setDrawer({ entry: null })}><Plus />Dodaj pierwszy wpis</TintedBtn>
                </Empty>
            )}

            {menuPos && createPortal(
                <Dropdown role="menu" style={menuPos} onClick={e => e.stopPropagation()}>
                    {!headButtons && (
                        <>
                            <MenuItem role="menuitem" type="button" onClick={() => { setMenuPos(null); setShowHistory(true); }}>
                                <Clock />Historia rozliczeń
                            </MenuItem>
                            <MenuItem role="menuitem" type="button" disabled={downloading} onClick={() => { setMenuPos(null); handleDownload(); }}>
                                <Download />Zestawienie PDF ({STATUS_LABELS[status].toLowerCase()})
                            </MenuItem>
                            <MenuDivider />
                        </>
                    )}
                    <MenuItem role="menuitem" type="button" onClick={() => { setMenuPos(null); onEditContractor(); }}>
                        <Pencil />Edytuj kontrahenta
                    </MenuItem>
                    <MenuItem role="menuitem" type="button" $danger onClick={() => { setMenuPos(null); onDeleteContractor(); }}>
                        <Trash2 />Usuń kontrahenta
                    </MenuItem>
                </Dropdown>,
                document.body,
            )}

            {drawer && (
                <EntryDrawer
                    key={drawer.entry?.id ?? 'new'}
                    contractorId={contractor.id}
                    contractorName={contractor.name}
                    entry={drawer.entry}
                    focus={drawer.focus}
                    onClose={() => setDrawer(null)}
                />
            )}

            {showSettlement && (
                <SettlementModal contractor={contractor} period={period} onClose={() => setShowSettlement(false)} />
            )}

            {showHistory && (
                <SettlementHistoryModal contractor={contractor} onClose={() => setShowHistory(false)} />
            )}

            <ConfirmationModal
                isOpen={confirmDelete !== null}
                title="Usunąć wpis?"
                message={confirmDelete ? `${vehicleName(confirmDelete)} z ${formatDay(confirmDelete.serviceDate)} (${formatMoney(confirmDelete.grossAmountCents)}) zniknie z listy do rozliczenia razem ze zdjęciami.` : ''}
                variant="danger"
                confirmText="Usuń wpis"
                cancelText="Zostaw"
                onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); }}
                onCancel={() => setConfirmDelete(null)}
            />
            <ConfirmationModal
                isOpen={confirmReopen !== null}
                title="Odblokować wpis do korekty?"
                message="Wpis wróci na listę do rozliczenia i trafi do najbliższego zestawienia jako korekta. Zestawienie, które już wysłano, zostaje bez zmian."
                variant="warning"
                confirmText="Odblokuj"
                cancelText="Zostaw rozliczony"
                onConfirm={() => { if (confirmReopen) handleReopen(confirmReopen); }}
                onCancel={() => setConfirmReopen(null)}
            />
        </Card>
    );
}
