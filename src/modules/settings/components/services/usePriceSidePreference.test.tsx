// @vitest-environment jsdom
// „Ceny: Brutto | Netto" w cenniku - wybór zapamiętany w przeglądarce.
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
    DEFAULT_PRICE_SIDE, PRICE_SIDE_STORAGE_KEY, readPriceSide, usePriceSidePreference, writePriceSide,
} from './usePriceSidePreference';

const broken = {
    getItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('QuotaExceededError'); },
};

describe('usePriceSidePreference', () => {
    afterEach(() => window.localStorage.clear());

    it('domyślnie brutto', () => {
        const { result } = renderHook(() => usePriceSidePreference());
        expect(result.current[0]).toBe('gross');
        expect(DEFAULT_PRICE_SIDE).toBe('gross');
    });

    it('wybór przeżywa ponowne otwarcie sekcji', () => {
        const first = renderHook(() => usePriceSidePreference());
        act(() => first.result.current[1]('net'));
        expect(first.result.current[0]).toBe('net');
        expect(window.localStorage.getItem(PRICE_SIDE_STORAGE_KEY)).toBe('net');
        first.unmount();

        const again = renderHook(() => usePriceSidePreference());
        expect(again.result.current[0]).toBe('net');
    });

    it('śmieci w pamięci przeglądarki → domyślne brutto', () => {
        window.localStorage.setItem(PRICE_SIDE_STORAGE_KEY, 'netto');
        expect(readPriceSide()).toBe('gross');
    });

    it('niedostępna pamięć przeglądarki nie wywraca sekcji', () => {
        expect(readPriceSide(broken)).toBe('gross');
        expect(() => writePriceSide('net', broken)).not.toThrow();
        expect(readPriceSide(null)).toBe('gross');
    });
});
