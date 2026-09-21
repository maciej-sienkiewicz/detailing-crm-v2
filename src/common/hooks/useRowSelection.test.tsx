// @vitest-environment jsdom
//
// Operacja grupowa dotyka tego, co użytkownik ma na ekranie. Gdy zmieni filtr albo
// stronę, zaznaczone wcześniej wiersze znikają mu z oczu - i muszą zniknąć także
// z zaznaczenia, bo inaczej „oznacz jako opłacone" ruszyłoby dokumenty, których
// nikt już nie widzi.
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRowSelection } from './useRowSelection';

describe('useRowSelection', () => {
    it('zaczyna bez zaznaczenia', () => {
        const { result } = renderHook(() => useRowSelection(['a', 'b']));

        expect(result.current.count).toBe(0);
        expect(result.current.allSelected).toBe(false);
        expect(result.current.someSelected).toBe(false);
    });

    it('przełącza pojedynczy wiersz w obie strony', () => {
        const { result } = renderHook(() => useRowSelection(['a', 'b']));

        act(() => result.current.toggle('a'));
        expect(result.current.selected).toEqual(['a']);
        expect(result.current.isSelected('a')).toBe(true);
        expect(result.current.someSelected).toBe(true);

        act(() => result.current.toggle('a'));
        expect(result.current.count).toBe(0);
    });

    it('zaznacza i odznacza wszystkie widoczne wiersze', () => {
        const { result } = renderHook(() => useRowSelection(['a', 'b', 'c']));

        act(() => result.current.toggleAll());
        expect(result.current.selected).toEqual(['a', 'b', 'c']);
        expect(result.current.allSelected).toBe(true);
        expect(result.current.someSelected).toBe(false);

        act(() => result.current.toggleAll());
        expect(result.current.count).toBe(0);
    });

    it('zaznaczenie kolejności nie zmienia - wraca w kolejności wierszy', () => {
        const { result } = renderHook(() => useRowSelection(['a', 'b', 'c']));

        act(() => result.current.toggle('c'));
        act(() => result.current.toggle('a'));

        expect(result.current.selected).toEqual(['a', 'c']);
    });

    it('po zmianie listy zaznaczone zostaje tylko to, co widać', () => {
        const { result, rerender } = renderHook(({ keys }) => useRowSelection(keys), {
            initialProps: { keys: ['a', 'b', 'c'] },
        });

        act(() => result.current.toggleAll());
        expect(result.current.count).toBe(3);

        rerender({ keys: ['b'] });

        expect(result.current.selected).toEqual(['b']);
        expect(result.current.count).toBe(1);
        expect(result.current.isSelected('a')).toBe(false);
    });

    it('powrót do poprzedniej listy nie wskrzesza zaznaczenia sprzed czyszczenia', () => {
        const { result, rerender } = renderHook(({ keys }) => useRowSelection(keys), {
            initialProps: { keys: ['a', 'b'] },
        });

        act(() => result.current.toggleAll());
        rerender({ keys: ['c'] });
        act(() => result.current.clear());
        rerender({ keys: ['a', 'b'] });

        expect(result.current.count).toBe(0);
    });

    it('pusta lista nie jest „wszystko zaznaczone”', () => {
        const { result } = renderHook(() => useRowSelection([]));

        expect(result.current.allSelected).toBe(false);

        act(() => result.current.toggleAll());
        expect(result.current.count).toBe(0);
    });
});
