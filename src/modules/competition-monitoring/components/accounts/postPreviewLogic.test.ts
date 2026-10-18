import { describe, expect, it } from 'vitest';
import type { OwnPost } from '../../accountsTypes';
import { avatarInitials, formatCount, postAspect, sampleComments, sampleLikes, tokenizeCaption } from './postPreviewLogic';

const post = (likes: number | null): OwnPost => ({
    mediaId: String(likes), permalink: null, thumbnailUrl: null, caption: null, takenAt: null, productType: null,
    reach: null, views: null, saved: null, shares: null, likes, comments: null,
});

describe('podgląd posta', () => {
    it('kadr jak przy publikacji: proporcja zdjęcia w zakresie 4:5-1,91:1', () => {
        expect(postAspect(1080, 1080)).toBe(1);
        expect(postAspect(1080, 1920)).toBe(0.8);      // pion telefonu → 4:5
        expect(postAspect(4000, 1000)).toBe(1.91);     // panorama → 1,91:1
        expect(postAspect(1600, 1200)).toBeCloseTo(4 / 3);
        expect(postAspect(0, 0)).toBe(1);
    });

    it('hashtagi i oznaczenia kolorem linku, adres e-mail zostaje tekstem', () => {
        expect(tokenizeCaption('Nowe BMW #detailing i @studio.pl.\nPisz: biuro@studio.pl')).toEqual([
            { kind: 'text', value: 'Nowe BMW ' },
            { kind: 'hashtag', value: '#detailing' },
            { kind: 'text', value: ' i ' },
            { kind: 'mention', value: '@studio.pl' },
            { kind: 'text', value: '.\nPisz: biuro@studio.pl' },
        ]);
        expect(tokenizeCaption('#powłokaceramiczna')).toEqual([{ kind: 'hashtag', value: '#powłokaceramiczna' }]);
    });

    it('polubienia w skali konta: mediana własnych postów, potem obserwujący, potem stała', () => {
        expect(sampleLikes([post(10), post(300), post(40)], 5000)).toBe(40);
        expect(sampleLikes([post(10), post(30)], null)).toBe(20);
        expect(sampleLikes([], 2000)).toBe(70);
        expect(sampleLikes(undefined, undefined)).toBe(47);
    });

    it('te same komentarze dla tego samego podpisu, liczba w skali polubień', () => {
        const a = sampleComments('Post o ceramice', 200);
        expect(sampleComments('Post o ceramice', 200)).toEqual(a);
        expect(a.shown).toHaveLength(2);
        expect(a.shown[0].username).not.toBe(a.shown[1].username);
        expect(a.total).toBe(12);
        expect(sampleComments('x', 3).total).toBe(2);
    });

    it('liczby i inicjały', () => {
        expect(formatCount(12345)).toBe('12 345');
        expect(avatarInitials('myjbruk.pl')).toBe('MY');
        expect(avatarInitials('detailing_studio')).toBe('DS');
    });
});
