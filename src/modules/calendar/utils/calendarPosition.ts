// src/modules/calendar/utils/calendarPosition.ts
//
// Gdzie użytkownik był w kalendarzu - żeby wejście w wizytę i powrót nie wyrzucały
// go z powrotem na „dziś".
//
// Scenariusz z recepcji: rozmowa z klientem, przewijanie listy dni w dół w poszukiwaniu
// wizyty, wejście w wizytę „czy to ta", powrót - i kalendarz od nowa stał na dzisiaj.
//
// Pamięć karty (sessionStorage), nie urządzenia: druga karta albo jutrzejsze otwarcie
// mają zaczynać od dziś. Do tego termin ważności - kalendarz otwarty po godzinie ma
// pokazać dzisiaj, a nie miejsce sprzed przerwy, o którym nikt już nie pamięta.
import type { CalendarView } from '../types';

const STORAGE_KEY = 'calendar:position';

/** Po takim czasie bez ruchu w kalendarzu wracamy do „dziś". */
export const CALENDAR_POSITION_TTL_MS = 60 * 60 * 1000;

export interface CalendarPosition {
    /** Widok FullCalendar (lista żyje nad siatką miesiąca, patrz `agendaList`). */
    view: CalendarView;
    /** Czy aktywny jest widok „Lista". */
    agendaList: boolean;
    /** Oglądana data, „RRRR-MM-DD" - FullCalendar odtworzy z niej miesiąc / tydzień / dzień. */
    date: string;
    /** Dzień na górze listy, „RRRR-MM-DD" - tam lista wraca po powrocie. */
    agendaTopDay?: string;
    savedAt: number;
}

export function readCalendarPosition(now: number = Date.now()): CalendarPosition | null {
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CalendarPosition;
        if (!parsed?.date || typeof parsed.savedAt !== 'number') return null;
        if (now - parsed.savedAt > CALENDAR_POSITION_TTL_MS) return null;
        return parsed;
    } catch {
        // Tryb prywatny / zablokowana pamięć: kalendarz po prostu startuje od dziś.
        return null;
    }
}

/** Dopisuje zmianę do zapamiętanej pozycji; `agendaTopDay: undefined` ją czyści. */
export function saveCalendarPosition(
    patch: Partial<Omit<CalendarPosition, 'savedAt'>>,
    now: number = Date.now(),
): void {
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        const current = raw ? (JSON.parse(raw) as Partial<CalendarPosition>) : {};
        const next = { ...current, ...patch, savedAt: now };
        if (!next.date) return;
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Bez pamięci kalendarz działa jak dotąd.
    }
}

/** „RRRR-MM-DD" w strefie przeglądarki - ten sam klucz dnia co w liście. */
export function toDayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
