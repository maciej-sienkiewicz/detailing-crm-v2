import { describe, expect, it } from 'vitest';
import { pageWindow } from './pagination';

describe('pageWindow', () => {
    it('mało stron: wszystkie', () => {
        expect(pageWindow(0, 1)).toEqual([0]);
        expect(pageWindow(1, 4)).toEqual([0, 1, 2, 3]);
    });

    it('wiele stron: pierwsza, ostatnia i sąsiedzi bieżącej zamiast każdej strony', () => {
        expect(pageWindow(0, 30)).toEqual([0, 1, 'gap', 29]);
        expect(pageWindow(15, 30)).toEqual([0, 'gap', 14, 15, 16, 'gap', 29]);
        expect(pageWindow(29, 30)).toEqual([0, 'gap', 28, 29]);
    });

    it('pojedyncza pominięta strona jest pokazana, a nie zastąpiona luką', () => {
        expect(pageWindow(3, 10)).toEqual([0, 1, 2, 3, 4, 'gap', 9]);
    });

    it('brak stron', () => {
        expect(pageWindow(0, 0)).toEqual([]);
    });
});
