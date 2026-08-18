// src/common/hooks/useVisualViewportSheet.ts

import { useEffect, useRef, type RefObject } from 'react';

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

    useEffect(() => {
        if (!active) return;

        const vv = window.visualViewport;
        if (!vv) return;

        let frame = 0;
        const settleTimers: ReturnType<typeof setTimeout>[] = [];

        const apply = () => {
            for (const ref of refsRef.current) {
                const el = ref.current;
                if (!el) continue;
                el.style.top = `${vv.offsetTop}px`;
                el.style.height = `${vv.height}px`;
                el.style.bottom = 'auto';
                el.style.maxHeight = 'none';
            }
        };

        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(apply);
        };

        schedule();
        // The keyboard slides in over ~250ms and iOS reports intermediate
        // geometry while it animates; re-measure once it has settled.
        settleTimers.push(setTimeout(schedule, 150), setTimeout(schedule, 400));

        vv.addEventListener('resize', schedule);
        vv.addEventListener('scroll', schedule);

        return () => {
            cancelAnimationFrame(frame);
            settleTimers.forEach(clearTimeout);
            vv.removeEventListener('resize', schedule);
            vv.removeEventListener('scroll', schedule);
        };
    }, [active]);
};
