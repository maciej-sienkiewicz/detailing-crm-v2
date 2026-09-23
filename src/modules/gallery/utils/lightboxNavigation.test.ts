import { describe, expect, it } from 'vitest';
import { isWaitingForPage, photoPosition, shownPhoto, stepLightbox, type GalleryPageView, type LightboxState } from './lightboxNavigation';
import type { GalleryPhoto } from '../types';

const photo = (id: string): GalleryPhoto => ({
    id, fileName: `${id}.jpg`, thumbnailUrl: `t/${id}`, fullSizeUrl: `f/${id}`, tags: [],
    uploadedAt: '2026-09-10T08:00:00Z', uploadedBy: 'u1', uploadedByName: 'Krzysztof Niemier', source: 'VISIT',
});

const PAGE_1 = ['a', 'b', 'c'].map(photo);
const PAGE_2 = ['d', 'e', 'f'].map(photo);
const view = (page: number, photos: GalleryPhoto[], isPlaceholderData = false, totalPages = 2): GalleryPageView =>
    ({ page, totalPages, photos, isPlaceholderData });

describe('strzałki w podglądzie galerii', () => {
    it('w obrębie strony: następne i poprzednie zdjęcie', () => {
        const state: LightboxState = { kind: 'photo', photo: PAGE_1[1] };
        expect(stepLightbox(state, 1, view(1, PAGE_1))).toEqual({ state: { kind: 'photo', photo: PAGE_1[2] }, page: 1 });
        expect(stepLightbox(state, -1, view(1, PAGE_1))).toEqual({ state: { kind: 'photo', photo: PAGE_1[0] }, page: 1 });
    });

    it('za ostatnim zdjęciem strony jest pierwsze zdjęcie następnej', () => {
        const step = stepLightbox({ kind: 'photo', photo: PAGE_1[2] }, 1, view(1, PAGE_1))!;
        expect(step.page).toBe(2);

        // Strona 2 jeszcze się wczytuje: podgląd zostaje przy zdjęciu „c", strzałki czekają.
        const loading = view(2, PAGE_1, true);
        expect(shownPhoto(step.state, loading)?.id).toBe('c');
        expect(isWaitingForPage(step.state, loading)).toBe(true);
        expect(stepLightbox(step.state, 1, loading)).toBeNull();

        // Strona 2 wczytana: podgląd pokazuje jej pierwsze zdjęcie.
        expect(shownPhoto(step.state, view(2, PAGE_2))?.id).toBe('d');
        expect(stepLightbox(step.state, 1, view(2, PAGE_2))?.state).toEqual({ kind: 'photo', photo: PAGE_2[1] });
    });

    it('przed pierwszym zdjęciem strony jest ostatnie zdjęcie poprzedniej', () => {
        const step = stepLightbox({ kind: 'photo', photo: PAGE_2[0] }, -1, view(2, PAGE_2))!;
        expect(step.page).toBe(1);
        expect(shownPhoto(step.state, view(1, PAGE_1))?.id).toBe('c');
    });

    it('na początku i na końcu całej galerii dalej nie ma zdjęć', () => {
        expect(stepLightbox({ kind: 'photo', photo: PAGE_1[0] }, -1, view(1, PAGE_1))).toBeNull();
        expect(stepLightbox({ kind: 'photo', photo: PAGE_2[2] }, 1, view(2, PAGE_2))).toBeNull();
    });

    it('pozycja w całej galerii liczy się przez strony', () => {
        expect(photoPosition(PAGE_2[1], view(2, PAGE_2), 3)).toBe(5);
        expect(photoPosition(PAGE_2[1], view(2, PAGE_1, true), 3)).toBeNull();
    });
});
