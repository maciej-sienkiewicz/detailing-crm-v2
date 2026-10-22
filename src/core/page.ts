/**
 * Strona listy - jeden kształt w całym API (audyt HTTP, P2-18): `{ items, page }`.
 * Parametry zapytania są wszędzie te same: `page` od 1 i `pageSize`.
 *
 * Backend do końca okresu przejściowego oddaje dawne kształty list otwartym kartom starego
 * frontu; nowy front prosi o ten format nagłówkiem [PAGE_FORMAT_HEADER] (apiClient).
 */
export interface PageMeta {
    /** Numer strony od 1. */
    number: number;
    size: number;
    totalItems: number;
    /** Co najmniej 1, także dla pustej listy. */
    totalPages: number;
}

export interface Page<T> {
    items: T[];
    page: PageMeta;
}

/** Lista przewijana kursorem: `nextCursor` idzie jako `cursor` po starsze wpisy; null = koniec. */
export interface CursorPage<T> {
    items: T[];
    nextCursor: string | null;
}

export const PAGE_FORMAT_HEADER = 'X-Page-Format';
export const PAGE_FORMAT = '2';

/** Pusta strona - wartość startowa dla widoków przed pierwszą odpowiedzią. */
export const emptyPage = <T>(size: number): Page<T> => ({
    items: [],
    page: { number: 1, size, totalItems: 0, totalPages: 1 },
});

/** Ta sama lista z innymi elementami (np. po mapowaniu DTO na model widoku). */
export const mapPage = <T, R>(page: Page<T>, map: (item: T) => R): Page<R> => ({
    items: page.items.map(map),
    page: page.page,
});
