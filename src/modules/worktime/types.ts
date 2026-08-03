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

export interface PeriodDetail extends PeriodSummary {
    entries: WorkTimeEntry[];
}

export interface UpsertEntryRequest {
    minutes: number;
    note?: string | null;
}
