/**
 * WorkTimeTab — shared utility functions and constants.
 * Pure functions only, no React/styled-components here.
 */

import type { BenefitType, WorkTimeEntryType } from '../../types';

// ─── Labels ───────────────────────────────────────────────────────────────────

export const MONTH_NAMES_PL = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
] as const;

/** Mon=0 … Sun=6 short labels in Polish (getDay()-adjusted, Sun last). */
export const DAY_NAMES_SHORT_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'] as const;

export const BENEFIT_TYPE_LABELS: Record<BenefitType, string> = {
    OVERTIME_150: 'Nadgodziny 150%',
    OVERTIME_200: 'Nadgodziny 200%',
    NIGHT_WORK:   'Praca nocna',
    HOLIDAY_WORK: 'Praca świąteczna',
    ON_CALL:      'Dyżur',
};

/** All entry types that count as a "benefit" (non-regular). */
export const BENEFIT_ENTRY_TYPES = new Set<WorkTimeEntryType>([
    'OVERTIME_150',
    'OVERTIME_200',
    'NIGHT_WORK',
    'HOLIDAY_WORK',
]);

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Format a Date object to YYYY-MM-DD without timezone shift. */
export function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Returns true when `d` is today (local time). */
export function isToday(d: Date): boolean {
    const now = new Date();
    return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
    );
}

/**
 * Returns the short Polish weekday label for a given Date.
 * We shift getDay() so that Monday = index 0.
 */
export function dayNameShort(d: Date): string {
    const dow = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const idx = dow === 0 ? 6 : dow - 1; // Mon=0 … Sun=6
    return DAY_NAMES_SHORT_PL[idx];
}

/** Returns true when the date falls on Saturday (6) or Sunday (0). */
export function isWeekendDay(d: Date): boolean {
    const dow = d.getDay();
    return dow === 0 || dow === 6;
}

// ─── Period helpers ───────────────────────────────────────────────────────────

/**
 * Human-readable Polish period label.
 * "2026-04" → "Kwiecień 2026"
 */
export function periodLabel(period: string): string {
    const [year, month] = period.split('-').map(Number);
    return `${MONTH_NAMES_PL[month - 1]} ${year}`;
}

/**
 * Returns the current month as a YYYY-MM string.
 */
export function currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Generate a descending list of YYYY-MM period strings starting from the
 * current month back to `hireDate`, capped at `maxMonths` entries.
 *
 * @param hireDate  YYYY-MM-DD string from EmployeeDetail.hireDate
 * @param maxMonths Safety cap — defaults to 48 (4 years)
 */
export function generatePeriods(hireDate: string, maxMonths = 48): string[] {
    const hire = new Date(hireDate + 'T00:00:00');
    const hireYear = hire.getFullYear();
    const hireMonth = hire.getMonth() + 1; // 1-indexed

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    const periods: string[] = [];

    for (let i = 0; i < maxMonths; i++) {
        periods.push(`${year}-${String(month).padStart(2, '0')}`);

        // Stop once we have reached the hire month
        if (year === hireYear && month === hireMonth) break;

        month--;
        if (month < 1) { month = 12; year--; }

        // Guard: don't go before hire date
        if (year < hireYear || (year === hireYear && month < hireMonth)) break;
    }

    return periods; // Most-recent first
}

/**
 * Returns an array of Date objects representing every calendar day in the
 * given YYYY-MM period.
 */
export function getDaysInMonth(period: string): Date[] {
    const [year, month] = period.split('-').map(Number);
    const count = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
    return Array.from({ length: count }, (_, i) => new Date(year, month - 1, i + 1));
}

/**
 * Returns the first and last date strings (YYYY-MM-DD) of a period.
 */
export function periodDateRange(period: string): { from: string; to: string } {
    const [year, month] = period.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {
        from: `${period}-01`,
        to: `${period}-${String(lastDay).padStart(2, '0')}`,
    };
}
