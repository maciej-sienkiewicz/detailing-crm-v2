// @vitest-environment jsdom
//
// Klawiatura ekranowa na trzech platformach. iOS przewija tylko visual viewport,
// a Android (Chrome z `interactive-widget=resizes-content` i aplikacja ze sklepu)
// skraca całe okno. Wcześniej hook porównywał `innerHeight` z `visualViewport` -
// na Androidzie obie liczby spadały razem i klawiatura była dla niego niewidoczna,
// więc dolny pasek nawigacji zasłaniał pole odpowiedzi na opinię.
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVirtualKeyboard } from './useVirtualKeyboard';

class FakeVisualViewport extends EventTarget {
    height = 866;
}

let vv: FakeVisualViewport;

beforeEach(() => {
    vv = new FakeVisualViewport();
    vi.stubGlobal('visualViewport', vv);
    vi.stubGlobal('innerWidth', 411);
    vi.stubGlobal('innerHeight', 866);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

/** iOS: okno zostaje, przesuwa się i maleje tylko visual viewport. */
const iosKeyboard = (visible: number) => act(() => {
    vv.height = visible;
    vv.dispatchEvent(new Event('resize'));
});

/** Android: maleje całe okno, a visual viewport razem z nim. */
const androidKeyboard = (visible: number) => act(() => {
    vi.stubGlobal('innerHeight', visible);
    vv.height = visible;
    window.dispatchEvent(new Event('resize'));
    vv.dispatchEvent(new Event('resize'));
});

describe('useVirtualKeyboard', () => {
    it('widzi klawiaturę na iOS, gdzie maleje tylko visual viewport', () => {
        const { result } = renderHook(() => useVirtualKeyboard());
        expect(result.current).toBe(false);

        iosKeyboard(500);
        expect(result.current).toBe(true);

        iosKeyboard(866);
        expect(result.current).toBe(false);
    });

    it('widzi klawiaturę na Androidzie, gdzie okno kurczy się razem z visual viewport', () => {
        const { result } = renderHook(() => useVirtualKeyboard());

        // Pomiar z emulatora: aplikacja DetailBoost, pole odpowiedzi na opinię Google.
        androidKeyboard(554);
        expect(result.current).toBe(true);

        androidKeyboard(866);
        expect(result.current).toBe(false);
    });

    it('chowanie paska adresu przeglądarki to nie klawiatura', () => {
        vi.stubGlobal('innerHeight', 810);
        vv.height = 810;
        const { result } = renderHook(() => useVirtualKeyboard());

        androidKeyboard(866);
        expect(result.current).toBe(false);

        // Od wyższego okna liczymy dalej: klawiatura nadal zostaje rozpoznana.
        androidKeyboard(520);
        expect(result.current).toBe(true);
    });

    it('obrót do poziomu zaczyna pomiar od nowa zamiast udawać klawiaturę', () => {
        const { result } = renderHook(() => useVirtualKeyboard());

        act(() => {
            vi.stubGlobal('innerWidth', 866);
            vi.stubGlobal('innerHeight', 411);
            vv.height = 411;
            window.dispatchEvent(new Event('resize'));
        });
        expect(result.current).toBe(false);

        androidKeyboard(220);
        expect(result.current).toBe(true);
    });
});
