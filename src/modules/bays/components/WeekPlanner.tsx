// src/modules/bays/components/WeekPlanner.tsx
//
// Tydzień po stanowiskach (komputer i tablet). Wiersz = stanowisko z własnym
// podziałem dnia, oś = czas. Gesty pod myszą, wszystkie z przyciąganiem do okienek
// wiersza:
//
//   - zaznaczenie wolnych okienek → formularz rezerwacji (QuickEventModal),
//     z etykietą na żywo, zanim puścisz przycisk;
//   - przeciągnięcie paska PLANU → inne stanowisko albo inny czas (długość zostaje);
//   - chwycenie krawędzi paska planu → rozciągnięcie albo skrócenie;
//   - przeciągnięcie auta z paska „Bez planu" → plan bez formularza (auto już jest).
//
// Faktu (zrobione, trwa) nie da się przeciągnąć - fakt zmienia się zdarzeniem na hali.
// Nałożenie planu jest dozwolone, ale nigdy ciche: przed zapisem okno pyta.
//
// Pozycja paska to czas, nie numer kolumny: wiersze z różnym podziałem dnia leżą na
// tej samej osi, a pionowa linia „teraz" przecina je wszystkie w tym samym miejscu.

import { useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { Hourglass, MoveHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActionMenu, MenuItem, StatusPill, ui, useActionMenu } from '@/common/components/ui';
import { formatClockTime } from '@/common/dateTime';
import { pluralPl } from '@/common/utils/plural';
import type { BaysSnapshot } from '../types';
import { buildWeekRows, cellBox, cellIsFree, freeCellsOn, overlapsInRange, type WeekBar, type WeekRow } from '../utils/weekLayout';
import {
    cellIndexAt, clockText, dayMonth, dayShort, durationLabel, formatMinutes, hoursOf, longestDay, rangeText,
    timeAtWeekX, toDateKey, weekX, type Cell,
} from '../utils/slots';
import { Avatar, Plate } from './primitives';

export interface RangeRequest {
    bayId: string;
    start: Date;
    end: Date;
    /** Z kim nachodzi - okno potwierdzenia pokazuje to przed formularzem. */
    overlaps: WeekBar[];
}

export interface MoveRequest {
    bookingId: string | null;
    carId: string;
    bayId: string;
    start: Date;
    end: Date;
    overlaps: WeekBar[];
}

interface Props {
    snap: BaysSnapshot;
    now: Date;
    days: string[];
    canEdit: boolean;
    onRange: (r: RangeRequest) => void;
    onTapCell: (bayId: string, cell: Cell) => void;
    onMove: (m: MoveRequest) => void;
    onDeleteBooking: (bookingId: string) => void;
}

/** Wiersz ma stałą wysokość jednego paska; nałożone paski dzielą ją między siebie. */
const ROW_H = 56;
const LANE_MIN = 34;
const rowHeight = (lanes: number) => Math.max(ROW_H, lanes * LANE_MIN + 8);
const pct = (v: number) => `${(v * 100).toFixed(4)}%`;

const Scroller = styled.div`
    overflow-x: auto;
    overscroll-behavior-x: contain;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    background: ${ui.surface};
`;

/* Kolumna nazw węższa na tablecie: tam każdy piksel osi to czytelniejszy pasek. */
const Grid = styled.div<{ $days: number }>`
    --label-w: 168px;
    min-width: calc(var(--label-w) + ${p => p.$days * 132}px);
    display: flex;
    flex-direction: column;

    @media (max-width: 1023px) { --label-w: 124px; }
`;

const rowGrid = css`
    display: grid;
    grid-template-columns: var(--label-w) minmax(0, 1fr);
`;

const HeadRow = styled.div`
    ${rowGrid}
    position: sticky;
    top: 0;
    z-index: 6;
    background: ${ui.surface};
    border-bottom: 1px solid ${ui.line};
`;

const Corner = styled.div`
    position: sticky;
    left: 0;
    z-index: 2;
    background: ${ui.surface};
    border-right: 1px solid ${ui.line};
`;

/* Pod nazwami dni pas na linijkę godzin i znacznik „teraz" - nic go nie zasłania. */
const Axis = styled.div<{ $ruler: boolean }>`
    position: relative;
    display: flex;
    padding-bottom: ${p => (p.$ruler ? '18px' : '0')};
`;

const Tick = styled.span`
    position: absolute;
    bottom: 3px;
    transform: translateX(-50%);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
    color: ${ui.textFaint};
    pointer-events: none;
`;

const DayHead = styled.div<{ $today: boolean }>`
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 9px 10px;
    border-left: 1px solid ${ui.line};
    background: ${p => (p.$today ? '#f6fafc' : 'transparent')};

    strong { font-size: 13.5px; font-weight: 700; color: ${p => (p.$today ? ui.brandDeep : ui.ink)}; }
    span { font-size: 12px; color: ${p => (p.$today ? ui.brandDeep : ui.textMuted)}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

const NowPill = styled.span`
    position: absolute;
    bottom: 3px;
    transform: translateX(-50%);
    z-index: 3;
    padding: 0 4px;
    background: ${ui.surface};
    color: ${ui.brandInk};
    font-size: 10.5px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
`;

const Row = styled.div`
    ${rowGrid}
    border-bottom: 1px solid ${ui.lineSoft};
    &:last-child { border-bottom: none; }
`;

const RowLabel = styled.div`
    position: sticky;
    left: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    padding: 8px 14px;
    background: ${ui.surface};
    border-right: 1px solid ${ui.line};

    strong { font-size: 14px; font-weight: 700; color: ${ui.ink}; }
    span { font-size: 12px; color: ${ui.textMuted}; }
`;

const Track = styled.div<{ $lanes: number; $selectable: boolean }>`
    position: relative;
    height: ${p => rowHeight(p.$lanes)}px;
    cursor: ${p => (p.$selectable ? 'cell' : 'default')};
    touch-action: pan-x pan-y;
`;

const Abs = styled.div`
    position: absolute;
    top: 0;
    bottom: 0;
    pointer-events: none;
`;

const CellBox = styled(Abs)<{ $past: boolean; $firstOfDay: boolean }>`
    border-left: 1px ${p => (p.$firstOfDay ? 'solid' : 'dashed')} ${p => (p.$firstOfDay ? ui.line : ui.lineSoft)};
    background: ${p => (p.$past ? 'rgba(241, 245, 249, 0.7)' : 'transparent')};
`;

const Closed = styled(Abs)`
    background: repeating-linear-gradient(135deg, ${ui.surfaceAlt} 0 6px, ${ui.surface} 6px 12px);
`;

const TodayTint = styled(Abs)`
    background: rgba(240, 246, 249, 0.45);
`;

/* Linia „teraz" ma tylko wskazać miejsce, nie konkurować z planem: włos, półprzezroczysty,
   pod paskami - widać ją w przerwach między autami. */
const NowLine = styled(Abs)`
    width: 0;
    border-left: 1px dashed ${ui.brandLine};
    z-index: 1;
`;

const BAR_TONES = {
    done: css`background: ${ui.surfaceAlt}; border: 1px solid ${ui.line}; color: ${ui.inkSoft};`,
    active: css`background: ${ui.brandTintHover}; border: 1px solid ${ui.brandLine}; color: ${ui.brandDeep};`,
    plan: css`background: ${ui.surface}; border: 1.5px dashed ${ui.brandLine}; color: ${ui.inkSoft};`,
};

const Bar = styled.div<{ $tone: keyof typeof BAR_TONES; $conflict: boolean; $over: boolean; $ghosted: boolean; $grab: boolean; $live: boolean }>`
    position: absolute;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    padding: 0 9px;
    box-sizing: border-box;
    border-radius: 8px;
    overflow: hidden;
    cursor: ${p => (p.$grab ? 'grab' : 'pointer')};
    pointer-events: ${p => (p.$live ? 'auto' : 'none')};
    ${p => BAR_TONES[p.$tone]}
    ${p => p.$conflict && css`border-color: #f59e0b; box-shadow: inset 0 0 0 1px #f59e0b;`}
    ${p => p.$over && css`box-shadow: inset -4px 0 0 #f59e0b;`}
    opacity: ${p => (p.$ghosted ? 0.3 : 1)};
    touch-action: pan-x pan-y;
    container-type: inline-size;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }

    /* Wąski pasek: zostaje sama tablica, opis jest w dymku i w menu. */
    @container (max-width: 90px) {
        padding: 0 6px;
        > span:first-child:not(:last-child) { display: none; }
    }
`;

/* Uchwyt krawędzi: szeroki na 10 px, żeby trafić myszą, widoczny po najechaniu. */
const Handle = styled.span<{ $side: 'start' | 'end' }>`
    position: absolute;
    top: 0;
    bottom: 0;
    ${p => (p.$side === 'start' ? 'left: 0;' : 'right: 0;')}
    width: 10px;
    cursor: ew-resize;
    z-index: 1;

    &::after {
        content: '';
        position: absolute;
        top: 30%;
        bottom: 30%;
        ${p => (p.$side === 'start' ? 'left: 3px;' : 'right: 3px;')}
        width: 3px;
        border-radius: 2px;
        background: ${ui.brandLine};
        opacity: 0;
        transition: opacity 120ms ease;
    }
    ${Bar}:hover &::after { opacity: 1; }
`;

/* Niski pasek (kilka aut naraz): jedna linia - tablica i opis obok siebie. */
const BarText = styled.span<{ $compact?: boolean }>`
    display: flex;
    flex-direction: ${p => (p.$compact ? 'row' : 'column')};
    align-items: ${p => (p.$compact ? 'baseline' : 'stretch')};
    gap: ${p => (p.$compact ? '6px' : '1px')};
    min-width: 0;

    > span {
        font-size: 12px;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    @container (max-width: 90px) { > span:last-child { display: none; } }
    /* Pasek węższy niż tablica: sam kolor, bez uciętych liter - opis w dymku i w menu. */
    @container (max-width: 52px) { display: none; }
`;

const Ghost = styled.div<{ $warn: boolean }>`
    position: absolute;
    top: 3px;
    bottom: 3px;
    z-index: 5;
    pointer-events: none;
    padding: 4px 9px;
    box-sizing: border-box;
    border-radius: 9px;
    border: 2px solid ${p => (p.$warn ? '#f59e0b' : ui.brand)};
    background: ${p => (p.$warn ? 'rgba(255, 251, 235, 0.94)' : 'rgba(240, 246, 249, 0.94)')};
    color: ${p => (p.$warn ? ui.warnInk : ui.brandDeep)};
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1.35;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    white-space: nowrap;

    > * { overflow: hidden; text-overflow: ellipsis; }
    span { font-weight: 500; }
`;

const Tray = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${ui.textSecondary};

    > strong { font-weight: 700; color: ${ui.ink}; margin-right: 4px; }
`;

const TrayChip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 12px;
    border-radius: ${ui.radiusControl};
    border: 1px dashed ${ui.lineStrong};
    background: ${ui.surface};
    font-family: inherit;
    font-size: 12.5px;
    color: ${ui.inkSoft};
    cursor: grab;

    svg { width: 14px; height: 14px; color: ${ui.textMuted}; }
    &:hover { border-color: ${ui.brandLine}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

const Legend = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    font-size: 12.5px;
    color: ${ui.textSecondary};
`;

const Swatch = styled.span<{ $tone: keyof typeof BAR_TONES }>`
    display: inline-block;
    width: 22px;
    height: 12px;
    margin-right: 7px;
    vertical-align: -2px;
    border-radius: 4px;
    ${p => BAR_TONES[p.$tone]}
`;

type Drag =
    | { kind: 'select'; rowId: string; anchor: number; current: number }
    | { kind: 'move'; carId: string; bookingId: string | null; minutes: number; grabMs: number; rowId: string; startIdx: number; len: number; moved: boolean; startX: number }
    | { kind: 'resize'; carId: string; bookingId: string; rowId: string; edge: 'start' | 'end'; startIdx: number; endIdx: number };

/** Opis podziału dnia pod nazwą stanowiska: ile trwa jedno okienko. */
const slotHint = (n: number, day: number) => (n === 1 ? 'cały dzień' : n === 2 ? 'pół dnia' : `co ${formatMinutes(Math.round(day / n))}`);

export function WeekPlanner({ snap, now, days, canEdit, onRange, onTapCell, onMove, onDeleteBooking }: Props) {
    const navigate = useNavigate();
    const { rows } = useMemo(() => buildWeekRows(snap, days, now), [snap, days, now]);
    const [drag, setDrag] = useState<Drag | null>(null);
    const dragRef = useRef<Drag | null>(null);
    dragRef.current = drag;
    const tracks = useRef(new Map<string, HTMLDivElement>());
    const suppressClick = useRef(false);
    const menu = useActionMenu<WeekBar>();
    const todayKey = toDateKey(now);
    const day = longestDay();
    const nowX = weekX(now, days);
    const todayHours = hoursOf(todayKey);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowVisible = days.includes(todayKey) && !!todayHours && nowMin >= todayHours.opens && nowMin <= todayHours.closes;

    const rowById = (id: string) => rows.find(r => r.rowId === id);
    const bayName = (id: string) => snap.bays.find(b => b.id === id)?.name ?? '';
    /** Okienko pod kursorem w danym wierszu. */
    const cellAt = (row: WeekRow, clientX: number): number => {
        const el = tracks.current.get(row.rowId);
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return cellIndexAt(row.cells, timeAtWeekX((clientX - r.left) / r.width, days));
    };
    /** Wiersz pod kursorem - pasek planu można przenieść na inne stanowisko. */
    const rowAt = (clientX: number, clientY: number): WeekRow | undefined => {
        const el = document.elementFromPoint(clientX, clientY)?.closest('[data-bay-row]');
        return el ? rowById(el.getAttribute('data-bay-row') ?? '') : undefined;
    };
    /** Pierwsze okienko, które jeszcze się nie skończyło - wcześniej nie da się planować. */
    const firstOpen = (row: WeekRow) => {
        const i = row.cells.findIndex(c => c.end > now);
        return i === -1 ? row.cells.length : i;
    };
    const range = (row: WeekRow, a: number, b: number) => {
        const lo = Math.max(firstOpen(row), Math.min(a, b));
        const hi = Math.min(row.cells.length - 1, Math.max(a, b, lo));
        return { lo, hi, start: row.cells[lo]?.start, end: row.cells[hi]?.end };
    };
    const moveTarget = (d: Extract<Drag, { kind: 'move' }>) => {
        const row = rowById(d.rowId);
        if (!row) return null;
        const lo = Math.max(firstOpen(row), d.startIdx);
        const hi = Math.min(row.cells.length - 1, lo + d.len - 1);
        if (!row.cells[lo] || !row.cells[hi]) return null;
        return { row, start: row.cells[lo].start, end: row.cells[hi].end };
    };

    // Ruch i koniec gestu łapiemy na oknie: kursor poza siatką też kończy zaznaczenie.
    useEffect(() => {
        if (!drag) return;
        const moveHandler = (e: PointerEvent) => {
            const d = dragRef.current;
            if (!d) return;
            if (d.kind === 'select') {
                const row = rowById(d.rowId);
                if (row) { const i = cellAt(row, e.clientX); if (i !== d.current) setDrag({ ...d, current: i }); }
            } else if (d.kind === 'resize') {
                const row = rowById(d.rowId);
                if (!row) return;
                const i = cellAt(row, e.clientX);
                const next = d.edge === 'end'
                    ? { ...d, endIdx: Math.max(d.startIdx, i) }
                    : { ...d, startIdx: Math.max(firstOpen(row), Math.min(d.endIdx, i)) };
                if (next.startIdx !== d.startIdx || next.endIdx !== d.endIdx) setDrag(next);
            } else {
                const row = rowAt(e.clientX, e.clientY) ?? rowById(d.rowId);
                if (!row) return;
                const el = tracks.current.get(row.rowId);
                if (!el) return;
                const r = el.getBoundingClientRect();
                const t = new Date(timeAtWeekX((e.clientX - r.left) / r.width, days).getTime() - d.grabMs);
                // Inny podział dnia w nowym wierszu: długość w okienkach liczymy od czasu, nie od liczby okienek.
                const len = Math.max(1, Math.round(d.minutes / (day / row.bay.slotsPerDay)));
                const startIdx = cellIndexAt(row.cells, t);
                const moved = d.moved || Math.abs(e.clientX - d.startX) > 4;
                if (moved !== d.moved || row.rowId !== d.rowId || startIdx !== d.startIdx || len !== d.len) {
                    setDrag({ ...d, rowId: row.rowId, startIdx, len, moved });
                }
            }
        };
        const up = () => {
            const d = dragRef.current;
            setDrag(null);
            if (!d) return;
            if (d.kind === 'select') {
                const row = rowById(d.rowId);
                if (!row) return;
                const r = range(row, d.anchor, d.current);
                if (r.start && r.end) onRange({ bayId: row.rowId, start: r.start, end: r.end, overlaps: overlapsInRange(row, r.start, r.end) });
                return;
            }
            if (d.kind === 'resize') {
                const row = rowById(d.rowId);
                if (!row) return;
                suppressClick.current = true;
                const start = row.cells[d.startIdx].start;
                const end = row.cells[d.endIdx].end;
                onMove({ bookingId: d.bookingId, carId: d.carId, bayId: d.rowId, start, end, overlaps: overlapsInRange(row, start, end, d.carId) });
                return;
            }
            if (!d.moved) return;
            suppressClick.current = true;
            const target = moveTarget(d);
            if (!target) return;
            onMove({
                bookingId: d.bookingId, carId: d.carId, bayId: target.row.rowId, start: target.start, end: target.end,
                overlaps: overlapsInRange(target.row, target.start, target.end, d.carId),
            });
        };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrag(null); };
        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup', up);
        window.addEventListener('keydown', esc);
        return () => {
            window.removeEventListener('pointermove', moveHandler);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('keydown', esc);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drag !== null]);

    const onTrackDown = (e: React.PointerEvent, row: WeekRow) => {
        if (!canEdit || e.button !== 0) return;
        const i = cellAt(row, e.clientX);
        if (i < firstOpen(row)) return;
        if (e.pointerType === 'touch') return; // dotyk przewija; tap obsługuje onClick
        e.preventDefault();
        setDrag({ kind: 'select', rowId: row.rowId, anchor: i, current: i });
    };

    const onTrackClick = (e: React.MouseEvent, row: WeekRow) => {
        if ((e.nativeEvent as PointerEvent).pointerType !== 'touch' || !canEdit) return;
        const c = row.cells[cellAt(row, e.clientX)];
        if (c && c.end > now && cellIsFree(row, c)) onTapCell(row.rowId, c);
    };

    const onBarDown = (e: React.PointerEvent, bar: WeekBar, row: WeekRow) => {
        e.stopPropagation();
        if (bar.kind !== 'plan' || !canEdit || e.pointerType === 'touch' || e.button !== 0) return;
        const el = tracks.current.get(row.rowId);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const t = timeAtWeekX((e.clientX - r.left) / r.width, days);
        const startIdx = cellIndexAt(row.cells, bar.start);
        const endIdx = cellIndexAt(row.cells, new Date(bar.end.getTime() - 60_000));
        setDrag({
            kind: 'move', carId: bar.carId, bookingId: bar.bookingId, minutes: bar.minutes,
            grabMs: Math.max(0, t.getTime() - bar.start.getTime()), rowId: row.rowId, startIdx, len: endIdx - startIdx + 1, moved: false, startX: e.clientX,
        });
    };

    const onHandleDown = (e: React.PointerEvent, bar: WeekBar, row: WeekRow, edge: 'start' | 'end') => {
        e.stopPropagation();
        if (!bar.bookingId || e.button !== 0) return;
        e.preventDefault();
        setDrag({
            kind: 'resize', carId: bar.carId, bookingId: bar.bookingId, rowId: row.rowId, edge,
            startIdx: cellIndexAt(row.cells, bar.start), endIdx: cellIndexAt(row.cells, new Date(bar.end.getTime() - 60_000)),
        });
    };

    const onTrayDown = (e: React.PointerEvent, carId: string) => {
        if (!canEdit || e.pointerType === 'touch' || e.button !== 0) return;
        e.preventDefault();
        // Bez planu nie wiadomo, ile auto postoi - zaczynamy od jednego okienka, potem rozciągnij.
        setDrag({ kind: 'move', carId, bookingId: null, minutes: 1, grabMs: 0, rowId: '', startIdx: -1, len: 1, moved: true, startX: e.clientX });
    };

    const unplanned = snap.cars.filter(c => c.stage === 'IN_SHOP'
        && !snap.bookings.some(b => b.carId === c.id)
        && !snap.stints.some(s => s.carId === c.id && s.endedAt === null));

    const ghostFor = (row: WeekRow) => {
        const d = drag;
        if (!d || d.rowId !== row.rowId) return null;
        let start: Date | undefined;
        let end: Date | undefined;
        let title = '';
        let hits: WeekBar[] = [];
        if (d.kind === 'select') {
            const r = range(row, d.anchor, d.current);
            start = r.start; end = r.end;
            title = bayName(row.rowId);
            if (start && end) hits = overlapsInRange(row, start, end);
        } else if (d.kind === 'resize') {
            start = row.cells[d.startIdx]?.start; end = row.cells[d.endIdx]?.end;
            title = snap.cars.find(c => c.id === d.carId)?.licensePlate ?? '';
            if (start && end) hits = overlapsInRange(row, start, end, d.carId);
        } else if (d.startIdx >= 0) {
            const t = moveTarget(d);
            if (t) { start = t.start; end = t.end; }
            title = `${snap.cars.find(c => c.id === d.carId)?.licensePlate ?? ''} na ${bayName(row.rowId)}`;
            if (start && end) hits = overlapsInRange(row, start, end, d.carId);
        }
        if (!start || !end) return null;
        const x = weekX(start, days);
        const w = weekX(end, days) - x;
        return (
            <Ghost $warn={hits.length > 0} style={{ left: pct(x), width: pct(w) }} aria-live="polite">
                <div>{title}</div>
                <span>{rangeText(start, end, now)}{hits.length ? `, nachodzi na ${hits.map(h => h.car.licensePlate).join(', ')}` : ''}</span>
            </Ghost>
        );
    };

    /** Pozycja paska: pełna wysokość wiersza, dzielona tylko z paskami, które na niego nachodzą. */
    const barBox = (bar: WeekBar, row: WeekRow): React.CSSProperties => {
        const inner = rowHeight(row.lanes) - 8;
        const gap = bar.laneCount > 1 ? 3 : 0;
        const h = inner / bar.laneCount;
        return { left: pct(bar.x), width: pct(bar.w), top: 4 + bar.lane * h, height: h - gap };
    };

    const renderBar = (bar: WeekBar, row: WeekRow) => {
        const people = snap.settings.trackPeople
            ? bar.personIds.map(id => snap.people.find(p => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p)
            : [];
        const curing = !!bar.curingUntil && new Date(bar.curingUntil) > now;
        const sub = bar.kind === 'plan'
            ? `${bar.car.jobTitle}, ${durationLabel(bar.minutes)}`
            : curing ? `Schnie do ${formatClockTime(bar.curingUntil)}`
                : `${bar.car.jobTitle}, ${bar.kind === 'active' ? 'trwa ' : ''}${formatMinutes(bar.minutes)}`;
        const ghosted = !!drag && drag.kind !== 'select' && (drag.kind === 'resize' || drag.moved) && drag.carId === bar.carId && bar.kind === 'plan';
        const editable = bar.kind === 'plan' && canEdit && !!bar.bookingId;
        return (
            <Bar
                key={bar.id}
                role="button"
                tabIndex={0}
                $tone={bar.kind}
                $conflict={bar.conflict}
                $over={bar.overPlan}
                $ghosted={ghosted}
                $grab={editable}
                $live={!drag}
                style={barBox(bar, row)}
                onPointerDown={e => onBarDown(e, bar, row)}
                onClick={e => {
                    e.stopPropagation();
                    if (suppressClick.current) { suppressClick.current = false; return; }
                    menu.toggle(e, bar, bar.id);
                }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); menu.toggle(e as unknown as React.MouseEvent<HTMLElement>, bar, bar.id); } }}
                aria-label={`${bar.car.licensePlate}, ${sub}, ${rangeText(bar.start, bar.end, now)}`}
                title={`${bar.car.licensePlate}, ${sub}\n${rangeText(bar.start, bar.end, now)}`}
            >
                {editable && <Handle $side="start" onPointerDown={e => onHandleDown(e, bar, row, 'start')} aria-hidden="true" />}
                {people.length > 0 && <Avatar person={people[0]} size={24} />}
                {curing && <Hourglass aria-hidden="true" size={14} />}
                <BarText $compact={bar.laneCount > 1}>
                    <Plate $size="sm" style={{ color: 'inherit' }}>{bar.car.licensePlate}</Plate>
                    <span>{sub}</span>
                </BarText>
                {editable && <Handle $side="end" onPointerDown={e => onHandleDown(e, bar, row, 'end')} aria-hidden="true" />}
            </Bar>
        );
    };

    const dayBackground = (row: WeekRow) => days.map((d, i) => {
        const h = hoursOf(d)!;
        const open = (h.closes - h.opens) / day;
        return (
            <span key={d}>
                {d === todayKey && <TodayTint style={{ left: pct(i / days.length), width: pct(1 / days.length) }} />}
                {open < 1 && <Closed style={{ left: pct((i + open) / days.length), width: pct((1 - open) / days.length) }} />}
                {row.cells.filter(c => c.date === d).map((c, ci) => {
                    const box = cellBox(c, days);
                    return <CellBox key={ci} $past={c.end <= now} $firstOfDay={ci === 0} style={{ left: pct(box.x), width: pct(box.w) }} />;
                })}
            </span>
        );
    });

    return (
        <>
            {canEdit && unplanned.length > 0 && (
                <Tray aria-label="Auta bez planu">
                    <strong>Bez planu</strong>
                    {unplanned.map(c => (
                        <TrayChip key={c.id} type="button" onPointerDown={e => onTrayDown(e, c.id)} title="Przeciągnij na stanowisko">
                            <MoveHorizontal aria-hidden="true" />
                            <Plate $size="sm">{c.licensePlate}</Plate>
                            {c.jobTitle}
                        </TrayChip>
                    ))}
                </Tray>
            )}

            <Scroller>
                <Grid $days={days.length} style={drag ? { userSelect: 'none', cursor: drag.kind === 'resize' ? 'ew-resize' : drag.kind === 'move' ? 'grabbing' : 'cell' } : undefined}>
                    <HeadRow>
                        <Corner />
                        <Axis $ruler={days.length <= 3}>
                            {days.map(d => {
                                const today = d === todayKey;
                                const free = rows.reduce((sum, r) => sum + freeCellsOn(r, d, now), 0);
                                return (
                                    <DayHead key={d} $today={today}>
                                        <strong>{dayShort(d)} {dayMonth(d)}{today ? ', dziś' : ''}</strong>
                                        <span>{d < todayKey ? 'minęło' : free === 0 ? 'brak wolnych okienek' : `${free} ${pluralPl(free, 'wolne okienko', 'wolne okienka', 'wolnych okienek')}`}</span>
                                    </DayHead>
                                );
                            })}
                            {/* Linijka godzin tylko przy krótkim zakresie: w tygodniu byłyby to kreski bez cyfr. */}
                            {days.length <= 3 && days.flatMap(d => {
                                const h = hoursOf(d)!;
                                return Array.from({ length: Math.floor((h.closes - h.opens) / 60) + 1 }, (_, k) => {
                                    const t = new Date(`${d}T00:00:00`);
                                    t.setMinutes(h.opens + k * 60);
                                    // Pełne godziny co jedną w widoku dnia, co dwie przy trzech dniach.
                                    // Bez skrajnych godzin: na krawędzi dnia cyfra wpadałaby na sąsiada.
                                    if (k === 0 || t.getHours() * 60 >= h.closes || (days.length > 1 && k % 2 === 1)) return null;
                                    return <Tick key={`${d}-${k}`} style={{ left: pct(weekX(t, days)) }}>{t.getHours()}</Tick>;
                                });
                            })}
                            {/* Godzina „teraz" tylko przy linijce godzin; w tygodniu wystarczy kolumna dnia. */}
                            {nowVisible && days.length <= 3 && <NowPill style={{ left: pct(nowX) }}>{clockText(now)}</NowPill>}
                        </Axis>
                    </HeadRow>

                    {rows.map(row => (
                        <Row key={row.rowId}>
                            <RowLabel>
                                <strong>{row.bay.name}</strong>
                                <span>{slotHint(row.bay.slotsPerDay, day)}{row.bay.capacity > 1 ? `, ${row.bay.capacity} naraz` : ''}</span>
                            </RowLabel>
                            <Track
                                data-bay-row={row.rowId}
                                ref={el => { if (el) tracks.current.set(row.rowId, el); else tracks.current.delete(row.rowId); }}
                                $lanes={row.lanes}
                                $selectable={canEdit}
                                onPointerDown={e => onTrackDown(e, row)}
                                onClick={e => onTrackClick(e, row)}
                            >
                                {dayBackground(row)}
                                {row.bars.map(b => renderBar(b, row))}
                                {ghostFor(row)}
                                {nowVisible && <NowLine style={{ left: pct(nowX) }} />}
                            </Track>
                        </Row>
                    ))}
                </Grid>
            </Scroller>

            <Legend aria-label="Legenda">
                <span><Swatch $tone="done" />Zrobione</span>
                <span><Swatch $tone="active" />Trwa</span>
                <span><Swatch $tone="plan" />Plan: przeciągnij, żeby przesunąć, chwyć krawędź, żeby zmienić długość</span>
            </Legend>

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje paska">
                {menu.menu && (
                    <>
                        <MenuItem disabled>
                            <Plate $size="sm">{menu.menu.item.car.licensePlate}</Plate>
                            <StatusPill $tone={menu.menu.item.kind === 'active' ? 'info' : 'neutral'}>
                                {({ plan: 'Plan', active: 'Trwa', done: 'Zrobione' } as const)[menu.menu.item.kind]}
                            </StatusPill>
                        </MenuItem>
                        <MenuItem disabled>{rangeText(menu.menu.item.start, menu.menu.item.end, now)}</MenuItem>
                        {menu.menu.item.car.visitId && (
                            <MenuItem onClick={() => { navigate(`/visits/${menu.menu!.item.car.visitId}`); menu.close(); }}>Otwórz wizytę</MenuItem>
                        )}
                        {menu.menu.item.kind === 'plan' && menu.menu.item.bookingId && canEdit && (
                            <MenuItem danger onClick={() => { onDeleteBooking(menu.menu!.item.bookingId!); menu.close(); }}>Usuń z planu</MenuItem>
                        )}
                    </>
                )}
            </ActionMenu>
        </>
    );
}
