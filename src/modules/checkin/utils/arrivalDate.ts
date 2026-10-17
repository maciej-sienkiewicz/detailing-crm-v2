import { fromDateToLocalInput, hasClockTime } from '@/common/dateTime';

/*
 * Data przyjęcia auta z rezerwacji z innego dnia.
 *
 * Kreator zaczyna wizytę „teraz" (patrz CheckInWizardWrapper). Przy rezerwacji z dnia
 * dzisiejszego to prawda, ale z wcześniejszego dnia są dwie zupełnie różne historie:
 *  a) auto stoi u nas od dnia rezerwacji, tylko nikt tego nie kliknął w CRM,
 *  b) klient się spóźnił i przyjechał dopiero dziś.
 * Kreator nie ma skąd wiedzieć, która jest prawdziwa, a od tej daty zależy protokół
 * podpisywany przez klienta, kalendarz i miesiąc przychodu - dlatego pyta, zamiast
 * po cichu wpisywać „teraz".
 */

export type ArrivalChoice = 'today' | 'planned' | 'other';

const dayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;

/** Ile dni kalendarzowych (w strefie przeglądarki) dzieli `from` od `to`. */
export function calendarDaysBetween(from: Date, to: Date): number {
    return dayNumber(to) - dayNumber(from);
}

/**
 * Czy trzeba zapytać o datę przyjęcia: rezerwacja zaczynała się któregoś z MINIONYCH dni.
 *
 * Rezerwacja z przyszłości (klient przyjechał wcześniej) nie pyta: auto stoi w studiu
 * dziś, więc wizyta zaczyna się dziś - „zostawienie" przyszłej daty wpisałoby na
 * protokół dzień, w którym auta jeszcze u nas nie było.
 */
export function needsArrivalDateDecision(plannedStart: string | null | undefined, now: Date): boolean {
    if (!plannedStart) return false;
    const planned = new Date(plannedStart);
    if (isNaN(planned.getTime())) return false;
    return calendarDaysBetween(planned, now) >= 1;
}

/** „wczoraj", „4 dni temu". */
export function daysAgoLabel(days: number): string {
    return days === 1 ? 'wczoraj' : `${days} dni temu`;
}

/**
 * „wtorek, 13 października, 09:00" - rok tylko, gdy inny niż bieżący, a godzina
 * tylko, gdy rezerwacja ją ma (całodniowa leży na północy - patrz hasClockTime).
 */
export function formatPlannedDay(value: string | Date, now: Date): string {
    const d = new Date(value);
    const day = d.toLocaleDateString('pl-PL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
    });
    return hasClockTime(d) ? `${day}, ${formatClock(d)}` : day;
}

/** „13.10, 9:00" albo „13.10" dla rezerwacji całodniowej - na kartę wyboru. */
export function formatShortDay(value: string | Date): string {
    const d = new Date(value);
    const day = d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
    return hasClockTime(d) ? `${day}, ${formatClock(d)}` : day;
}

const formatClock = (d: Date) => d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

/** Data przyjęcia z innego dnia nie może być w przyszłości - auto już u nas stoi. */
export function isFutureArrival(localInput: string, now: Date): boolean {
    const d = new Date(localInput);
    return !isNaN(d.getTime()) && d.getTime() > now.getTime();
}

/**
 * Wybrana odpowiedź jako wartość pola „Data rozpoczęcia" (YYYY-MM-DDTHH:mm, czas lokalny)
 * albo null, gdy odpowiedzi jeszcze nie ma lub data jest nie do przyjęcia.
 *
 * „W dniu rezerwacji" bierze termin rezerwacji DOKŁADNIE - to jest „zostaw, jak było".
 */
export function resolveArrivalStart(
    choice: ArrivalChoice | null,
    plannedStart: string,
    otherValue: string,
    now: Date,
): string | null {
    switch (choice) {
        case 'today':
            return fromDateToLocalInput(now);
        case 'planned':
            return fromDateToLocalInput(new Date(plannedStart));
        case 'other': {
            if (!otherValue || isNaN(new Date(otherValue).getTime())) return null;
            return isFutureArrival(otherValue, now) ? null : otherValue;
        }
        default:
            return null;
    }
}

/**
 * Zmiany formularza po wyborze daty przyjęcia. Koniec zostaje, dopóki jest po początku
 * (zwykle jest - liczy go wrapper od bieżącej chwili); inaczej ta sama reguła co przy
 * ręcznej zmianie początku w kreatorze: godzina po rozpoczęciu.
 */
export function arrivalStartUpdates(
    start: string,
    currentEnd: string | undefined,
): { visitStartAt: string; visitEndAt?: string } {
    const s = new Date(start);
    const e = currentEnd ? new Date(currentEnd) : null;
    if (e && !isNaN(e.getTime()) && e.getTime() > s.getTime()) {
        return { visitStartAt: start };
    }
    return { visitStartAt: start, visitEndAt: fromDateToLocalInput(new Date(s.getTime() + 60 * 60 * 1000)) };
}
