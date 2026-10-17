import type { PublishVisit } from '../../accountsTypes';

/**
 * Reguły publikacji z generatora - te same liczby co w backendzie (PublishRules).
 * Sprawdzamy je przed wysłaniem, bo publikacja trwa kilkanaście sekund: odmowa
 * po pół minuty czekania za zbyt długi podpis byłaby najgorszym możliwym momentem.
 */
export const MAX_PUBLISH_PHOTOS = 10;
export const MAX_CAPTION = 2200;
export const MAX_HASHTAGS = 30;

const HASHTAG = /#[\p{L}\p{N}_]+/gu;

export const countHashtags = (caption: string): number => caption.match(HASHTAG)?.length ?? 0;

/** Zdanie o tym, co blokuje publikację podpisu; null, gdy podpis przejdzie. */
export const captionProblem = (caption: string): string | null => {
    if (caption.length > MAX_CAPTION) return `Podpis może mieć do ${MAX_CAPTION} znaków (teraz ${caption.length}).`;
    const hashtags = countHashtags(caption);
    if (hashtags > MAX_HASHTAGS) return `Instagram przyjmuje do ${MAX_HASHTAGS} hashtagów (teraz ${hashtags}).`;
    return null;
};

/**
 * Zaznaczenie zdjęcia w kolejności klikania - ta kolejność jest kolejnością karuzeli.
 * Odznaczenie środkowego przesuwa resztę, a jedenaste zdjęcie się nie dokłada.
 */
export const togglePhoto = (selected: string[], photoId: string, max = MAX_PUBLISH_PHOTOS): string[] => {
    if (selected.includes(photoId)) return selected.filter(id => id !== photoId);
    if (selected.length >= max) return selected;
    return [...selected, photoId];
};

/** Zdjęcia wizyty, z której otwarto generator - zaznaczone od razu, do limitu karuzeli. */
export const initialSelection = (visits: PublishVisit[], visitId: string | undefined): string[] => {
    if (!visitId) return [];
    const visit = visits.find(v => v.visitId === visitId);
    return visit ? visit.photos.slice(0, MAX_PUBLISH_PHOTOS).map(p => p.id) : [];
};
