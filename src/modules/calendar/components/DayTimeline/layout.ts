import type { CalendarEvent } from '../../types';
import type { PlacedEvent, DayStats } from './types';

export const HOUR_HEIGHT  = 72;   // px per hour
export const DAY_START_H  = 6;    // 06:00
export const DAY_END_H    = 21;   // 21:00
export const TOTAL_HOURS  = DAY_END_H - DAY_START_H;
export const TIMELINE_PX  = TOTAL_HOURS * HOUR_HEIGHT;
export const MINS_TO_PX   = HOUR_HEIGHT / 60;
export const TIME_COL_W   = 56;   // px – left time-label column width
export const COL_GAP      = 3;    // px – gap between parallel event columns

export const HOUR_LABELS: string[] = Array.from(
    { length: TOTAL_HOURS + 1 },
    (_, i) => `${String(DAY_START_H + i).padStart(2, '0')}:00`
);

// ─── Time helpers ─────────────────────────────────────────────────────────────

export function minFromMidnight(d: Date): number {
    return d.getHours() * 60 + d.getMinutes();
}

export function nowMinutes(): number {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
}

export function nowTopPx(): number {
    const min = nowMinutes();
    return (min - DAY_START_H * 60) * MINS_TO_PX;
}

export function isWithinTimeline(min: number): boolean {
    return min >= DAY_START_H * 60 && min <= DAY_END_H * 60;
}

// ─── Layout algorithm ─────────────────────────────────────────────────────────

/**
 * Assigns each timed event a column (col) and computes how many parallel
 * columns its overlap group requires (totalCols).  Returns pixel-positioned
 * PlacedEvent objects ready for absolute CSS placement.
 *
 * Algorithm:
 *   1. Sort events by start time (longer events first on ties).
 *   2. Greedy column assignment – place each event in the first column whose
 *      last occupant has already ended.
 *   3. For each event, scan all overlapping events and take max(col) + 1 as
 *      totalCols so every event in a group shares the same width.
 */
export function layoutTimedEvents(events: CalendarEvent[]): PlacedEvent[] {
    if (events.length === 0) return [];

    const dayStartMin = DAY_START_H * 60;
    const dayEndMin   = DAY_END_H   * 60;

    const items = events
        .filter(ev => !ev.allDay)
        .map(ev => {
            const s = new Date(ev.start as string);
            const e = ev.end
                ? new Date(ev.end as string)
                : new Date(s.getTime() + 60 * 60_000);

            const startMin = minFromMidnight(s);
            // Timed event ending exactly at midnight → treat as previous day's last minute
            let endMin = minFromMidnight(e);
            if (endMin === 0) endMin = 24 * 60;

            return {
                event: ev,
                startMin,
                endMin: Math.max(startMin + 15, endMin), // enforce 15-min minimum
                col: 0,
                totalCols: 1,
                topPx: 0,
                heightPx: 0,
            };
        });

    // Sort: earlier start first; on tie put longer events first so they grab col 0
    items.sort((a, b) =>
        a.startMin !== b.startMin
            ? a.startMin - b.startMin
            : (b.endMin - b.startMin) - (a.endMin - a.startMin)
    );

    // Greedy column assignment
    const colEnds: number[] = [];
    for (const item of items) {
        let placed = false;
        for (let i = 0; i < colEnds.length; i++) {
            if (item.startMin >= colEnds[i]) {
                item.col = i;
                colEnds[i] = item.endMin;
                placed = true;
                break;
            }
        }
        if (!placed) {
            item.col = colEnds.length;
            colEnds.push(item.endMin);
        }
    }

    // Compute totalCols = max column among all events that overlap this one, + 1
    for (const item of items) {
        let maxCol = item.col;
        for (const other of items) {
            if (item.startMin < other.endMin && item.endMin > other.startMin) {
                maxCol = Math.max(maxCol, other.col);
            }
        }
        item.totalCols = maxCol + 1;
    }

    // Pixel positions (clamped to visible timeline range)
    for (const item of items) {
        const visStart = Math.max(item.startMin, dayStartMin);
        const visEnd   = Math.min(item.endMin,   dayEndMin);
        item.topPx    = (visStart - dayStartMin) * MINS_TO_PX;
        item.heightPx = Math.max(28, (visEnd - visStart) * MINS_TO_PX);
    }

    return items;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function computeDayStats(events: CalendarEvent[]): DayStats {
    let totalGross = 0;
    let visitCount = 0;
    let appointmentCount = 0;

    for (const ev of events) {
        const props = ev.extendedProps as { type: string; totalPrice?: number; currency?: string };
        if (props.type === 'VISIT') visitCount++;
        else appointmentCount++;
        totalGross += props.totalPrice ?? 0;
    }

    return {
        totalEvents: events.length,
        visitCount,
        appointmentCount,
        totalGross,
        currency: 'PLN',
    };
}
