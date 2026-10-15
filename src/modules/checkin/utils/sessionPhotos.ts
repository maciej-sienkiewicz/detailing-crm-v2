import type { PhotoSlot } from '../types';

/**
 * Lista zdjęć sesji przychodzi z serwera BEZ tagów (sesja ich nie trzyma - tagi idą
 * osobnym zapisem pod id zdjęcia). Krok zdjęć podmieniał nią `formData.photos` przy
 * każdym odświeżeniu, więc wgranie kolejnego zdjęcia kasowało tagi nadane wcześniejszym.
 * Tagi wpisane na miejscu przenosimy więc na świeżą listę po id.
 */
export const withLocalTags = (sessionPhotos: PhotoSlot[], current: PhotoSlot[]): PhotoSlot[] => {
    const tagsById = new Map(current.filter(p => p.tags !== undefined).map(p => [p.id, p.tags]));
    return sessionPhotos.map(photo =>
        photo.tags === undefined && tagsById.has(photo.id) ? { ...photo, tags: tagsById.get(photo.id) } : photo,
    );
};
