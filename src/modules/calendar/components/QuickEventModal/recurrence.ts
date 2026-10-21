// src/modules/calendar/components/QuickEventModal/recurrence.ts
//
// Reguły serii rezerwacji wspólne dla panelu „Cykliczność" i walidacji zapisu.
//
// Serwer przyjmuje dzień miesiąca 1–28 (CreateRecurringAppointmentHandler: dzień 29–31
// nie istnieje w każdym miesiącu). Panel pozwalał na 31 i podpisywał to „maks. 31", więc
// wybór 29–31 kończył się technicznym komunikatem serwera. „Do daty" bez daty szło do
// serwera jako pusty tekst, a podgląd obiecywał wtedy 104 rezerwacje.

import type { RecurrenceRuleRequest } from '@/modules/appointments/types';

/** Najpóźniejszy dzień miesiąca, który serwer przyjmie w serii miesięcznej. */
export const MAX_DAY_OF_MONTH = 28;

/** Dzień miesiąca daty startu (`YYYY-MM-DD…`), przycięty do [MAX_DAY_OF_MONTH]. */
export const dayOfMonthFrom = (startIso: string): number => {
    const day = Number(startIso.slice(8, 10));
    if (!Number.isFinite(day) || day < 1) return 1;
    return Math.min(day, MAX_DAY_OF_MONTH);
};

/** Pierwszy błąd reguły serii albo `null`, gdy serwer ją przyjmie. */
export const recurrenceError = (rule: RecurrenceRuleRequest, startIso: string): string | null => {
    if (rule.type === 'WEEKLY') {
        if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) return 'Wybierz co najmniej jeden dzień tygodnia';
        const interval = rule.intervalWeeks ?? 0;
        if (interval < 1 || interval > 52) return 'Powtarzaj co 1–52 tygodnie';
    }
    if (rule.type === 'MONTHLY') {
        const day = rule.dayOfMonth ?? 0;
        if (day < 1 || day > MAX_DAY_OF_MONTH) return `Dzień miesiąca musi być od 1 do ${MAX_DAY_OF_MONTH}`;
    }
    if (rule.endType === 'DATE') {
        if (!rule.endDate) return 'Podaj datę końca serii';
        if (startIso && rule.endDate < startIso.slice(0, 10)) return 'Koniec serii jest przed pierwszą rezerwacją';
    }
    if (rule.endType === 'COUNT') {
        const count = rule.maxOccurrences ?? 0;
        if (count < 1 || count > 104) return 'Liczba rezerwacji w serii musi być od 1 do 104';
    }
    return null;
};
