import { useEffect, useState } from 'react';

/**
 * Tracks the on-screen keyboard on touch devices.
 *
 * Why this exists: iOS Safari never resizes the layout viewport when the
 * keyboard opens. It scrolls the *visual* viewport instead, so anything
 * `position: fixed` to the bottom edge (the mobile bottom nav, a sticky modal
 * footer) visibly detaches and floats over the middle of the screen.
 * `visualViewport` is the only reliable signal for that on iOS.
 *
 * Android Chrome is handled declaratively by `interactive-widget=resizes-content`
 * in the viewport meta, but it reports through the same API, so one hook covers
 * both.
 *
 * Returns `true` only while a virtual keyboard is actually up — a plain address
 * bar collapse moves the viewport by far less than the threshold.
 */
export const useVirtualKeyboard = (): boolean => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        // A keyboard eats a large slice of the screen; browser chrome does not.
        const THRESHOLD_RATIO = 0.2;

        const sync = () => {
            const hidden = window.innerHeight - vv.height;
            setIsOpen(hidden > window.innerHeight * THRESHOLD_RATIO);
        };

        sync();
        vv.addEventListener('resize', sync);
        vv.addEventListener('scroll', sync);
        return () => {
            vv.removeEventListener('resize', sync);
            vv.removeEventListener('scroll', sync);
        };
    }, []);

    return isOpen;
};
