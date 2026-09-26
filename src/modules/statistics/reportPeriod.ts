// src/modules/statistics/reportPeriod.ts
//
// Okres raportu właściciela. Ta sama arytmetyka co ReportPeriod.lastFullWeeks
// w backendzie: pełne tygodnie poniedziałek–niedziela zakończone PRZED dniem
// dzisiejszym. W niedzielę bieżący tydzień jeszcze trwa, więc bierzemy poprzedni.
//
// Okres wysyłamy do API zawsze jawnie (from/to), żeby podpis pod przyciskiem był
// dokładnie tym, co przyjdzie w pliku.

export type ReportPeriodOption = 'WEEK' | 'TWO_WEEKS' | 'CUSTOM';

export interface ReportRange {
    from: string; // yyyy-MM-dd
    to: string;   // yyyy-MM-dd
}

/** Tyle samo co ReportPeriod.MAX_DAYS w backendzie. */
export const MAX_REPORT_DAYS = 93;

const pad = (n: number) => String(n).padStart(2, '0');

/** Data lokalna jako yyyy-MM-dd — bez toISOString(), które przesuwa dzień o strefę. */
export function toIsoDate(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIsoDate(value: string): Date {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function lastFullWeeks(weeks: number, today: Date): ReportRange {
    const daysBackToSunday = today.getDay() === 0 ? 7 : today.getDay();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysBackToSunday);
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7 * weeks + 1);
    return { from: toIsoDate(start), to: toIsoDate(end) };
}

export function daysInRange(range: ReportRange): number {
    const ms = parseIsoDate(range.to).getTime() - parseIsoDate(range.from).getTime();
    return Math.round(ms / 86_400_000) + 1;
}

/** Komunikat, dlaczego własnego okresu nie da się pobrać; null = w porządku. */
export function validateRange(range: ReportRange): string | null {
    if (!range.from || !range.to) return 'Wybierz obie daty.';
    if (range.to < range.from) return 'Data końca jest przed datą początku.';
    if (daysInRange(range) > MAX_REPORT_DAYS) return `Raport obejmuje najwyżej ${MAX_REPORT_DAYS} dni.`;
    return null;
}

/** „14.09–20.09.2026"; przez przełom roku pełne daty po obu stronach. */
export function formatRange(range: ReportRange): string {
    const from = parseIsoDate(range.from);
    const to = parseIsoDate(range.to);
    const full = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    const short = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
    return from.getFullYear() === to.getFullYear()
        ? `${short(from)}–${full(to)}`
        : `${full(from)}–${full(to)}`;
}

export function reportFileName(range: ReportRange): string {
    return `raport-${range.from}-${range.to}.pdf`;
}
