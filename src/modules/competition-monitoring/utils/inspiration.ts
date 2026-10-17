/**
 * „3,4× normy" - ile razy lepiej niż typowy post tego samego profilu. Okolice jedynki
 * to „w normie": różnica 1,02× nie jest informacją, a wygląda jak wynik.
 */
export const normLabel = (relativeToNorm: number | null | undefined): string | null => {
    if (relativeToNorm === null || relativeToNorm === undefined || !Number.isFinite(relativeToNorm)) return null;
    if (relativeToNorm >= 0.95 && relativeToNorm < 1.05) return 'w normie';
    const value = relativeToNorm.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${value}× normy`;
};

/**
 * Adres oficjalnego osadzenia posta (ta sama strona, której używa „Osadź" na Instagramie).
 * Null bez kodu posta - wtedy karta pokazuje ikonę formatu zamiast pustej ramki.
 */
export const embedUrl = (postCode: string | null | undefined): string | null => {
    const code = postCode?.trim();
    if (!code || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
    return `https://www.instagram.com/p/${code}/embed/`;
};

/** Kolejność Inspiracji. Wartości to `sort` endpointu `/content`. */
export type InspirationSort = 'norm' | 'date' | 'weakest';

export const INSPIRATION_SORT_OPTIONS: { value: InspirationSort; label: string }[] = [
    { value: 'norm', label: 'Skuteczność' },
    { value: 'date', label: 'Najnowsze' },
    { value: 'weakest', label: 'Najsłabsze' },
];

/**
 * Podpis obok filtrów: mówi, co znaczy bieżąca kolejność. „Najsłabsze" to najniżej
 * względem normy WŁASNEGO profilu - słaby post dużego konta może mieć więcej reakcji
 * niż najlepszy post małego.
 */
export const inspirationSortCaption = (sort: InspirationSort, weeks: number): string => {
    const period = `ostatnie ${weeks} tygodni`;
    if (sort === 'date') return `${period}, od najnowszych`;
    if (sort === 'weakest') return `${period}, od najsłabszych względem normy profilu`;
    return `${period}, od najlepszych względem normy profilu`;
};
