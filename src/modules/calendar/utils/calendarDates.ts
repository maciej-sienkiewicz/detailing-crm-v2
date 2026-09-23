import type { CalendarEvent } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Dzień kalendarzowy ('YYYY-MM-DD') chwili w strefie przeglądarki - tej samej, w której
 * rysuje kalendarz.
 *
 * NIE `toISOString().slice(0, 10)`: to jest dzień w UTC. Rezerwacja całodniowa zaczyna
 * się o północy czasu polskiego, czyli o 22:00 (latem) albo 23:00 (zimą) UTC dnia
 * POPRZEDNIEGO - i taki dzień wychodził z cięcia napisu.
 */
export const localDateKey = (value: string | Date): string => dateKey(new Date(value));

/** Dzień po `key` ('YYYY-MM-DD'); liczony na kalendarzu, więc zmiana czasu nie przeszkadza. */
export const nextDateKey = (key: string): string => {
    const [y, m, d] = key.split('-').map(Number);
    return dateKey(new Date(y, m - 1, d + 1));
};

/**
 * Wydarzenie w postaci, której oczekuje FullCalendar.
 *
 * Rezerwacja całodniowa kończy się chwilą na OSTATNIM dniu (23:59:59, bywa 23:45) i ten
 * dzień się liczy - tak czytają ją podgląd wydarzenia, widok tygodnia i backend (dostawa
 * Door to Door). FullCalendar czyta koniec wydarzenia całodniowego jako WYŁĄCZNY i obcina
 * z niego godzinę: 28.09 23:45 stawało się 28.09 00:00, więc pasek rezerwacji 24-28.09
 * kończył się 27.09, dzień za wcześnie. Dostaje więc same daty (dni lokalne) i koniec
 * na dzień po ostatnim.
 *
 * Nowa rezerwacja całodniowa jest zawsze jednodniowa (isSameLocalDay przy zapisie,
 * AppointmentSchedule.resolveAllDay na backendzie), ale zapisane wcześniej bywają
 * wielodniowe - stąd koniec z danych, a nie założony jeden dzień.
 *
 * Wydarzenia z godzinami przechodzą bez zmian.
 */
export function toFullCalendarEvent(event: CalendarEvent): CalendarEvent {
    if (!event.allDay) return event;
    const first = localDateKey(event.start);
    const last = event.end ? localDateKey(event.end) : first;
    return { ...event, start: first, end: nextDateKey(last < first ? first : last) };
}
