export type PeriodStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED';

export interface WorkTimeEntry {
    date: string;       // YYYY-MM-DD
    minutes: number;
    hours: string;      // formatted like "8:30"
    note: string | null;
}

export interface PeriodSummary {
    period: string;     // YYYY-MM
    label: string;      // "Lipiec 2026"
    status: PeriodStatus;
    totalMinutes: number;
    totalHours: string;
    entryCount: number;
    returnNote: string | null;
}

/**
 * Dzień miesiąca w karcie czasu pracy (docs/api-worktime-months.md). Ten sam kształt
 * dostaje pracownik (`GET /my/worktime/periods/{p}`) i przełożony (`CardDetail.days`) -
 * obaj widzą te same święta, urlopy i braki, liczone przez backend, a nie zgadywane
 * z dnia tygodnia.
 */
export interface CardDay {
    date: string;                     // YYYY-MM-DD
    /** null = brak wpisu. */
    minutes: number | null;
    note: string | null;
    isWorkingDay: boolean;
    holidayName: string | null;
    /** Urlop albo L4 w tym dniu, np. `{ type: 'SICK', label: 'L4' }`. */
    leave: null | { type: string; label: string };
    /** Dzień roboczy ≤ dziś bez wpisu i bez urlopu/L4. */
    missing: boolean;
}

export interface PeriodDetail extends PeriodSummary {
    entries: WorkTimeEntry[];
    /** Wszystkie dni miesiąca; starszy backend mógł ich nie wysyłać. */
    days?: CardDay[];
    /** Norma: (dni robocze − dni roboczych urlopu/L4) × 480 min. */
    expectedMinutes?: number;
    missingWorkingDays?: number;
}

export interface UpsertEntryRequest {
    minutes: number;
    note?: string | null;
}
