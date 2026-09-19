/**
 * Zakresy dat modułu finansowego - jedno źródło prawdy dla nagłówka strony,
 * filtrów zakładek i kafli podsumowania.
 *
 * Wydzielone z widoku, bo korzysta z nich i widok, i komponenty, które widok
 * renderuje. Import w drugą stronę (komponent → widok) zamykałby cykl, a takie
 * cykle w module ładowanym przez router kończą się pustym ekranem, nie błędem
 * kompilacji.
 */

export type DatePreset =
    | 'currentMonth'
    | 'previousMonth'
    | 'all'
    | 'week'
    | 'month'
    | 'quarter'
    | 'custom';

export interface DateRange {
    dateFrom?: string;
    dateTo?: string;
}

/**
 * Data w strefie użytkownika, nie w UTC. toISOString() cofa datę o strefę, więc nad
 * ranem pierwszego dnia miesiąca „bieżący miesiąc" zaczynałby się w miesiącu poprzednim.
 */
export const toISODate = (d: Date): string => {
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
};

export const getPresetRange = (preset: DatePreset): DateRange => {
    if (preset === 'all' || preset === 'custom') return {};
    const today = new Date();

    // Bieżący miesiąc to miesiąc kalendarzowy, a nie ostatnie 30 dni: rozliczenia
    // prowadzi się od pierwszego do ostatniego dnia, więc zakres obejmuje cały miesiąc
    // (także dni, które dopiero nadejdą - faktura bywa wystawiona z datą w przód).
    if (preset === 'currentMonth') {
        const from = new Date(today.getFullYear(), today.getMonth(), 1);
        const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { dateFrom: toISODate(from), dateTo: toISODate(to) };
    }

    // Poprzedni miesiąc w całości - zakres, po który sięga się przy zamykaniu
    // miesiąca i rozliczeniu z księgowością. Dzień 0 następnego miesiąca to
    // ostatni dzień poprzedniego, więc luty i lata przestępne wychodzą same.
    if (preset === 'previousMonth') {
        const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const to = new Date(today.getFullYear(), today.getMonth(), 0);
        return { dateFrom: toISODate(from), dateTo: toISODate(to) };
    }

    const days = preset === 'week' ? 7 : preset === 'month' ? 30 : 90;
    const from = new Date(today);
    from.setDate(today.getDate() - days);
    return { dateFrom: toISODate(from), dateTo: toISODate(today) };
};

/** Zakres obowiązujący dla danego stanu filtra - preset albo własne daty. */
export const resolveDateRange = (preset: DatePreset, customFrom: string, customTo: string): DateRange =>
    preset === 'custom'
        ? { dateFrom: customFrom || undefined, dateTo: customTo || undefined }
        : getPresetRange(preset);

/** Nazwa miesiąca jako podpowiedź przy presecie - „sierpień 2026". */
export const monthHint = (offset = 0): string => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + offset, 1)
        .toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
};
