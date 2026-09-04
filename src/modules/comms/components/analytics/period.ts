// src/modules/comms/components/analytics/period.ts
// Okres, za który liczymy rachunek.
//
// „30 / 90 / 365 dni" wyglądało na wylosowane, bo takie było: to są jednostki
// wygodne dla zapytania SQL, a nie dla człowieka, który prowadzi firmę. Właściciel
// studia rozlicza się miesiącami - księgowa, podatek, ZUS i pensje chodzą w tym
// rytmie, więc „ile zarobiłem w tym miesiącu" jest pytaniem, które faktycznie
// sobie zadaje. „Ostatnie 90 dni" nie odpowiada żadnemu wydarzeniu w jego roku.
//
// Zostają trzy tryby: bieżący miesiąc (jak mi idzie TERAZ), poprzedni miesiąc
// (zamknięty rachunek, jedyny w pełni porównywalny) i zakres własny (wszystko
// inne, na żądanie).

export type PeriodMode = 'current' | 'previous' | 'custom';

export interface Period {
    mode: PeriodMode;
    /** Początek okresu, lokalny start dnia. */
    from: Date;
    /** Koniec okresu - zawsze koniec ostatniego dnia, żeby klucz zapytania był stabilny. */
    to: Date;
    label: string;
}

const MONTHS_NOMINATIVE = [
    'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
    'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

const startOfDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

/** „1–22 sierpnia" albo „1–31 lipca 2026" - rok tylko wtedy, gdy nie jest bieżący. */
const monthLabel = (date: Date, now: Date): string =>
    date.getFullYear() === now.getFullYear()
        ? MONTHS_NOMINATIVE[date.getMonth()]
        : `${MONTHS_NOMINATIVE[date.getMonth()]} ${date.getFullYear()}`;

/**
 * Buduje okres dla trybu. [now] wstrzykiwane, bo czas jest tu wejściem, nie
 * ukrytym efektem - dzięki temu funkcja jest czysta i daje się przetestować.
 */
export const buildPeriod = (mode: 'current' | 'previous', now: Date): Period => {
    if (mode === 'previous') {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // Dzień zerowy bieżącego miesiąca to ostatni dzień poprzedniego - bez
        // ręcznego liczenia, ile dni ma luty w roku przestępnym.
        const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
        return { mode, from, to, label: monthLabel(from, now) };
    }
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    // Koniec dzisiejszego dnia, nie „teraz": granica z dokładnością do milisekundy
    // zmieniałaby klucz zapytania przy każdym przerysowaniu widoku i pamięć
    // podręczna nie trafiłaby ani razu. Dane i tak kończą się na ostatnim leadzie.
    return { mode: 'current', from, to: endOfDay(now), label: monthLabel(from, now) };
};

export const customPeriod = (from: Date, to: Date): Period => ({
    mode: 'custom',
    from: startOfDay(from),
    to: endOfDay(to),
    label: `${formatShort(from)} – ${formatShort(to)}`,
});

/** „12.08.2026" - w zakresie własnym data musi być jednoznaczna, nie ładna. */
export const formatShort = (date: Date): string =>
    `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;

/** „2026-08-12" - postać dla <input type="date">, w czasie lokalnym. */
export const toInputValue = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const fromInputValue = (value: string): Date | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};
