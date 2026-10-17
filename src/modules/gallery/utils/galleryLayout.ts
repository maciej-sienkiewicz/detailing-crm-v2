// src/modules/gallery/utils/galleryLayout.ts
//
// Układ siatki galerii: ile kolumn i ile zdjęć na stronę.
//
// Wcześniej siatka stała na `repeat(auto-fill, minmax(220px, 1fr))` przy stałych
// 12 zdjęciach na stronę. Liczba kolumn wynikała wtedy z szerokości okna, a nie
// z decyzji: przy 5 albo 7 kolumnach ostatni wiersz strony był w połowie pusty,
// a zwinięcie paska bocznego przestawiało całą siatkę.
//
// Teraz liczba kolumn bierze się z WIELKOŚCI kafelka (wybór użytkownika) i z
// szerokości samej kolumny treści (container query), a każda liczba kolumn
// w tabeli niżej dzieli każdy rozmiar strony - więc ostatni wiersz pełnej strony
// jest zawsze pełny, na telefonie i na szerokim monitorze.

export type GalleryDensity = 'large' | 'medium' | 'small';

/** Próg szerokości KOLUMNY TREŚCI (px) → liczba kolumn od tego progu w górę. */
export interface ColumnStep {
    minWidth: number;
    columns: number;
}

export const GALLERY_COLUMNS: Record<GalleryDensity, ColumnStep[]> = {
    large: [
        { minWidth: 0, columns: 1 },
        { minWidth: 560, columns: 2 },
        { minWidth: 960, columns: 3 },
        { minWidth: 1360, columns: 4 },
    ],
    medium: [
        { minWidth: 0, columns: 2 },
        { minWidth: 600, columns: 3 },
        { minWidth: 860, columns: 4 },
        { minWidth: 1320, columns: 6 },
    ],
    small: [
        { minWidth: 0, columns: 3 },
        { minWidth: 520, columns: 4 },
        { minWidth: 820, columns: 6 },
        { minWidth: 1200, columns: 8 },
    ],
};

/** Każdy rozmiar dzieli się przez 1, 2, 3, 4, 6 i 8 - patrz komentarz na górze. */
export const GALLERY_PAGE_SIZES = [24, 48, 96] as const;
export type GalleryPageSize = (typeof GALLERY_PAGE_SIZES)[number];

export const DEFAULT_DENSITY: GalleryDensity = 'medium';
export const DEFAULT_PAGE_SIZE: GalleryPageSize = 24;

const DENSITIES: GalleryDensity[] = ['large', 'medium', 'small'];

/** Wartość z localStorage może być stara albo zmyślona - do układu wpuszczamy tylko znane. */
export function normalizeDensity(value: unknown): GalleryDensity {
    return DENSITIES.includes(value as GalleryDensity) ? (value as GalleryDensity) : DEFAULT_DENSITY;
}

export function normalizePageSize(value: unknown): GalleryPageSize {
    return GALLERY_PAGE_SIZES.includes(value as GalleryPageSize) ? (value as GalleryPageSize) : DEFAULT_PAGE_SIZE;
}

/** Liczba kolumn dla danej szerokości kolumny treści - to samo, co liczy CSS. */
export function columnsFor(density: GalleryDensity, containerWidth: number): number {
    let columns = GALLERY_COLUMNS[density][0].columns;
    for (const step of GALLERY_COLUMNS[density]) {
        if (containerWidth >= step.minWidth) columns = step.columns;
    }
    return columns;
}

/**
 * Strona po zmianie rozmiaru strony: ta, na której leży pierwsze zdjęcie
 * oglądanej dotąd strony. Powrót na stronę 1 wyrzucałby użytkownika z miejsca,
 * do którego doszedł, a zostawienie numeru - przeskakiwało o setki zdjęć.
 */
export function pageAfterResize(page: number, oldSize: number, newSize: number): number {
    const firstIndex = (Math.max(1, page) - 1) * oldSize;
    return Math.floor(firstIndex / newSize) + 1;
}
