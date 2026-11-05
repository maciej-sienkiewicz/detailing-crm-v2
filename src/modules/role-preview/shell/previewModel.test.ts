import { describe, expect, it } from 'vitest';
import { changeCount, changesWord, diffCodes, effectiveExpiry, frameLostSession, sameSelection } from './previewModel';

describe('model okna podglądu', () => {
    it('różnica względem roli z ustawień: co dodane, co odebrane', () => {
        const diff = diffCodes(['A', 'B', 'C'], ['B', 'C', 'D', 'E']);

        expect([...diff.added].sort()).toEqual(['D', 'E']);
        expect([...diff.removed]).toEqual(['A']);
        expect(changeCount(diff)).toBe(3);
        expect(changeCount(diffCodes(['A'], ['A']))).toBe(0);
    });

    it('ten sam zbiór w innej kolejności to ten sam zbiór', () => {
        expect(sameSelection(new Set(['A', 'B']), new Set(['B', 'A']))).toBe(true);
        expect(sameSelection(new Set(['A']), new Set(['A', 'B']))).toBe(false);
        expect(sameSelection(new Set(['A', 'B']), new Set(['A', 'C']))).toBe(false);
    });

    it('podgląd kończy się wcześniejszym z terminów', () => {
        expect(effectiveExpiry('2026-09-23T12:00:00Z', '2026-09-23T11:30:00Z').toISOString()).toBe('2026-09-23T11:30:00.000Z');
        expect(effectiveExpiry('2026-09-23T11:00:00Z', '2026-09-23T11:30:00Z').toISOString()).toBe('2026-09-23T11:00:00.000Z');
    });

    it('aplikacja w ramce na ekranie logowania to koniec sesji podglądu', () => {
        expect(frameLostSession('/login')).toBe(true);
        expect(frameLostSession('/login/pin')).toBe(true);
        expect(frameLostSession('/calendar')).toBe(false);
        expect(frameLostSession('/loginy')).toBe(false);
    });

    it('liczba zmian po polsku: 1 zmiana, 2 zmiany, 5 zmian, 12 zmian, 22 zmiany', () => {
        expect([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 104].map(n => `${n} ${changesWord(n)}`)).toEqual([
            '1 zmiana', '2 zmiany', '4 zmiany', '5 zmian', '11 zmian', '12 zmian', '14 zmian',
            '21 zmian', '22 zmiany', '25 zmian', '104 zmiany',
        ]);
    });
});
