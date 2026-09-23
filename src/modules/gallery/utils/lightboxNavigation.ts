import type { GalleryPhoto } from '../types';

/**
 * Stan podglądu zdjęcia w galerii.
 *
 * Galeria jest stronicowana, a strzałki w podglądzie przechodzą przez granicę strony:
 * za ostatnim zdjęciem strony jest pierwsze zdjęcie następnej. Taka strona może się
 * jeszcze wczytywać, więc zamiast konkretnego zdjęcia pamiętamy wtedy „krawędź" strony
 * docelowej, a do czasu jej wczytania podgląd zostaje przy zdjęciu, z którego ruszyliśmy.
 */
export type LightboxState =
    | { kind: 'photo'; photo: GalleryPhoto }
    | { kind: 'edge'; page: number; edge: 'first' | 'last'; from: GalleryPhoto }
    | null;

export interface GalleryPageView {
    page: number;
    totalPages: number;
    /** Zdjęcia bieżącej strony (w trakcie wczytywania - jeszcze poprzedniej). */
    photos: GalleryPhoto[];
    /** Czy `photos` to jeszcze poprzednia strona, pokazywana w trakcie wczytywania. */
    isPlaceholderData: boolean;
}

const edgeReady = (state: Extract<LightboxState, { kind: 'edge' }>, view: GalleryPageView) =>
    state.page === view.page && !view.isPlaceholderData && view.photos.length > 0;

/** Zdjęcie widoczne w podglądzie. */
export function shownPhoto(state: LightboxState, view: GalleryPageView): GalleryPhoto | null {
    if (!state) return null;
    if (state.kind === 'photo') return state.photo;
    if (!edgeReady(state, view)) return state.from;
    return state.edge === 'first' ? view.photos[0] : view.photos[view.photos.length - 1];
}

/** Czy podgląd czeka na wczytanie strony - strzałki są wtedy nieaktywne. */
export function isWaitingForPage(state: LightboxState, view: GalleryPageView): boolean {
    return state?.kind === 'edge' && !edgeReady(state, view);
}

/**
 * Krok strzałką: nowy stan podglądu i strona galerii, albo null, gdy dalej nie ma
 * zdjęć (początek albo koniec całej galerii) albo strona jeszcze się wczytuje.
 */
export function stepLightbox(
    state: LightboxState,
    direction: 1 | -1,
    view: GalleryPageView,
): { state: LightboxState; page: number } | null {
    const photo = shownPhoto(state, view);
    if (!photo || isWaitingForPage(state, view)) return null;

    const index = view.photos.findIndex(p => p.id === photo.id);
    if (index < 0) return null;

    const target = index + direction;
    if (target >= 0 && target < view.photos.length) {
        return { state: { kind: 'photo', photo: view.photos[target] }, page: view.page };
    }

    const page = view.page + direction;
    if (page < 1 || page > view.totalPages) return null;
    return { state: { kind: 'edge', page, edge: direction === 1 ? 'first' : 'last', from: photo }, page };
}

/** Pozycja zdjęcia w całej galerii (1-based), np. „12 / 236"; null, gdy nieznana. */
export function photoPosition(
    photo: GalleryPhoto | null,
    view: GalleryPageView,
    pageSize: number,
): number | null {
    if (!photo || view.isPlaceholderData) return null;
    const index = view.photos.findIndex(p => p.id === photo.id);
    return index < 0 ? null : (view.page - 1) * pageSize + index + 1;
}
