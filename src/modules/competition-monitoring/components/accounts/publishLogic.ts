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

/**
 * Zdjęcia, które zobaczy generator. Sześć mieści typową karuzelę realizacji, a każde
 * kolejne to tylko tokeny wejścia - backend przyjmuje najwyżej tyle samo.
 */
export const MAX_AI_PHOTOS = 6;

/** Domyślnie pierwsze cztery: dość, żeby model zobaczył auto z kilku stron, bez przepłacania. */
const DEFAULT_AI_PHOTOS = 4;

export const defaultAiSelection = (visit: PublishVisit | undefined): string[] =>
    visit ? visit.photos.slice(0, DEFAULT_AI_PHOTOS).map(p => p.id) : [];

export const realizationTopic = (vehicle: string): string => `Realizacja: ${vehicle}`;

/**
 * Temat po zmianie realizacji. Temat pusty albo nadany automatycznie („Realizacja: BMW X5",
 * także z „Do zrobienia") idzie za nowym autem; każdy inny zostaje - właściciel mógł już
 * napisać coś własnego.
 */
export const topicAfterVisitChange = (topic: string, next: PublishVisit | undefined): string => {
    const trimmed = topic.trim();
    if (trimmed !== '' && !/^realizacja:/i.test(trimmed)) return topic;
    return next ? realizationTopic(next.vehicle) : '';
};

/**
 * Zaznaczenie do publikacji po wygenerowaniu: te same zdjęcia, które widział model -
 * tekst je opisuje, więc inne zdjęcia w poście rozjechałyby się z podpisem. Bez wyboru
 * dla modelu wracamy do dawnego zachowania (zdjęcia wizyty, z której otwarto generator).
 */
export const publishSeed = (aiPhotos: string[], visits: PublishVisit[], visitId: string | undefined): string[] =>
    aiPhotos.length > 0 ? aiPhotos.slice(0, MAX_PUBLISH_PHOTOS) : initialSelection(visits, visitId);
