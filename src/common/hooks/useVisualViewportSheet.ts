// src/common/hooks/useVisualViewportSheet.ts

import { useLayoutEffect, useRef, type RefObject } from 'react';

type SheetRef = RefObject<HTMLElement | null>;

/**
 * Pins a full-screen mobile sheet to the *visible* region of the screen.
 *
 * Why this is not just `top: 0; bottom: 0`:
 * `position: fixed` resolves against the **layout** viewport. iOS Safari never
 * resizes the layout viewport when the keyboard opens; it shrinks the
 * **visual** viewport and scrolls it down inside the layout viewport. So a
 * sheet pinned to `top: 0` gets parked `vv.offsetTop` pixels *above* the first
 * visible pixel (its header and search field disappear off the top edge) while
 * its bottom is still swallowed by the keyboard.
 *
 * Positioning against `visualViewport` fixes both edges at once:
 *   top    = vv.offsetTop  → first visible pixel of the screen
 *   height = vv.height     → ends exactly where the keyboard begins
 *
 * Android Chrome reports through the same API (`offsetTop` stays 0 because
 * `interactive-widget=resizes-content` shrinks the layout viewport instead), so
 * a single path covers both platforms. Browsers without the API keep the CSS
 * fallback (`top: 0; bottom: 0`).
 */
export const useVisualViewportSheet = (active: boolean, ...refs: SheetRef[]): void => {
    // Refs are stable objects but the rest-args array is a new identity every
    // render, so keep it out of the effect deps to bind listeners once.
    const refsRef = useRef(refs);
    refsRef.current = refs;

    useLayoutEffect(() => {
        if (!active) return;

        const vv = window.visualViewport;
        if (!vv) return;

        let frame = 0;
        let settleTimer: ReturnType<typeof setTimeout> | null = null;
        let appliedHeight = vv.height;

        const apply = () => {
            appliedHeight = vv.height;
            for (const ref of refsRef.current) {
                const el = ref.current;
                if (!el) continue;
                el.style.top = `${vv.offsetTop}px`;
                el.style.height = `${vv.height}px`;
                el.style.bottom = 'auto';
                el.style.maxHeight = 'none';
            }
        };

        const applyNextFrame = () => {
            if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(apply);
        };

        /**
         * Klawiatura wjeżdża około 300 ms i przez ten czas iOS raportuje kolejne
         * pośrednie wysokości. Przykładanie każdej z nich sprawiało, że arkusz
         * przez pół sekundy był wąskim paskiem u góry ekranu, spod którego widać
         * było poprzedni widok. Kurczymy go więc dopiero, gdy wymiary przestaną
         * się zmieniać — a do tego czasu zostaje na pełnym ekranie (CSS: top 0,
         * bottom 0), czyli tam, gdzie użytkownik go widzi od pierwszej klatki.
         */
        const applyWhenSettled = () => {
            cancelAnimationFrame(frame);
            if (settleTimer) clearTimeout(settleTimer);
            settleTimer = setTimeout(() => { settleTimer = null; apply(); }, 120);
        };

        const onViewportChange = () => {
            // Powiększenie obszaru (klawiatura znika) nie ma czego psuć — od razu.
            if (vv.height >= appliedHeight) applyNextFrame();
            else applyWhenSettled();
        };

        // Pierwsze przyłożenie tylko wtedy, gdy klawiatura JUŻ jest na ekranie.
        // Przy zamkniętej klawiaturze fallback z CSS daje poprawny pełny ekran,
        // więc nie ma czego nadpisywać.
        if (window.innerHeight - vv.height > 120) apply();

        vv.addEventListener('resize', onViewportChange);
        vv.addEventListener('scroll', onViewportChange);

        return () => {
            cancelAnimationFrame(frame);
            if (settleTimer) clearTimeout(settleTimer);
            vv.removeEventListener('resize', onViewportChange);
            vv.removeEventListener('scroll', onViewportChange);
        };
    }, [active]);
};
