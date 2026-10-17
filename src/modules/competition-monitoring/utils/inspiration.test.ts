import { describe, expect, it } from 'vitest';
import { embedUrl, inspirationSortCaption, normLabel } from './inspiration';

describe('normLabel', () => {
    it('krotność normy po polsku, okolice jedynki to norma', () => {
        expect(normLabel(3.42)).toBe('3,4× normy');
        expect(normLabel(1.02)).toBe('w normie');
        expect(normLabel(0.6)).toBe('0,6× normy');
        expect(normLabel(null)).toBeNull();
        expect(normLabel(undefined)).toBeNull();
    });
});

describe('embedUrl', () => {
    it('kod posta daje stronę oficjalnego osadzenia', () => {
        expect(embedUrl('DPa1x-_')).toBe('https://www.instagram.com/p/DPa1x-_/embed/');
    });

    it('bez kodu albo z podejrzanym kodem nie ma ramki', () => {
        expect(embedUrl('')).toBeNull();
        expect(embedUrl(undefined)).toBeNull();
        expect(embedUrl('abc/../x')).toBeNull();
    });
});

describe('kolejność Inspiracji', () => {
    it('podpis mówi, od czego zaczyna się lista', () => {
        expect(inspirationSortCaption('norm', 12)).toBe('ostatnie 12 tygodni, od najlepszych względem normy profilu');
        expect(inspirationSortCaption('date', 12)).toBe('ostatnie 12 tygodni, od najnowszych');
        expect(inspirationSortCaption('weakest', 12)).toBe('ostatnie 12 tygodni, od najsłabszych względem normy profilu');
    });
});
