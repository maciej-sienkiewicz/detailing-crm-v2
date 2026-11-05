// src/modules/visits/components/handover/handoverDate.ts
//
// Data wydania, gdy „Wydaj pojazd" klika się po fakcie. Zgłoszenie biznesu z 05.11.2026:
// auto wyjechało, a w CRM ktoś kliknął wydanie kilka dni później - wizyta, statystyki
// i dokumenty dostawały wtedy dzień kliknięcia zamiast dnia wydania.
//
// Daty to dni kalendarzowe YYYY-MM-DD w czasie polskim (localIsoDate); jako tekst
// porównują się poprawnie. Godzinę wydania ustala serwer (Visit.handoverMoment).

import { localIsoDate } from '@/common/utils/localDate';
import type { HandoverProblem } from '../../types/handover';

export type HandoverDateChoice = 'PLANNED' | 'TODAY' | 'OTHER';

export interface HandoverDateState {
    /** null = jeszcze nie wybrano; pytanie wymaga odpowiedzi przed wydaniem. */
    choice: HandoverDateChoice | null;
    /** Dzień wpisany przy „Z inną datą". */
    other: string;
}

export const emptyHandoverDate: HandoverDateState = { choice: null, other: '' };

/** Dzień planowanego zakończenia wizyty albo null, gdy wizyta nie ma planu. */
export const plannedDay = (estimatedCompletionDate?: string | null): string | null =>
    estimatedCompletionDate ? localIsoDate(new Date(estimatedCompletionDate)) : null;

/**
 * Czy pytać o datę: dziś jest już PO dniu planowanego zakończenia. Wydanie tego samego
 * dnia, tylko później niż w planie, pytania nie wymaga - liczy się dzień.
 */
export const isAfterPlannedDay = (estimatedCompletionDate?: string | null, today: string = localIsoDate()): boolean => {
    const planned = plannedDay(estimatedCompletionDate);
    return planned !== null && planned < today;
};

/** Dzień wydania wysyłany na serwer; undefined = teraz (tak jak wydanie bez pytania). */
export const pickupDateFor = (
    state: HandoverDateState,
    estimatedCompletionDate?: string | null,
    today: string = localIsoDate()
): string | undefined => {
    if (state.choice === 'PLANNED') return plannedDay(estimatedCompletionDate) ?? undefined;
    if (state.choice === 'OTHER' && state.other && state.other !== today) return state.other;
    return undefined;
};

/** „2 listopada 2026" - dzień YYYY-MM-DD bez przesunięcia o strefę. */
export const dayLabel = (iso: string): string => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Braki pytania o datę. Te same granice co na serwerze (nie w przyszłości, nie przed
 * rozpoczęciem wizyty) - żeby przycisk wydania był wyłączony, zanim serwer odmówi.
 *
 * @param earliest dzień rozpoczęcia wizyty (YYYY-MM-DD)
 */
export const handoverDateProblems = (
    state: HandoverDateState,
    earliest: string | null,
    today: string = localIsoDate()
): HandoverProblem[] => {
    const problem = (message: string): HandoverProblem[] => [{ section: 'handoverDate', message }];
    if (!state.choice) return problem('Wybierz, z jaką datą zakończyć wizytę.');
    if (state.choice !== 'OTHER') return [];
    if (!state.other) return problem('Wybierz dzień wydania w kalendarzu.');
    if (state.other > today) return problem('Data wydania nie może być w przyszłości.');
    if (earliest && state.other < earliest) {
        return problem(`Data wydania nie może być wcześniejsza niż rozpoczęcie wizyty (${dayLabel(earliest)}).`);
    }
    return [];
};
