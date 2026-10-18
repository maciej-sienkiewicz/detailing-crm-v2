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
 * Android jest odwrotnie: Chrome z `interactive-widget=resizes-content` i aplikacja
 * ze sklepu (MainActivity odsuwa WebView od klawiatury) skracają CAŁE okno -
 * `innerHeight` spada razem z `visualViewport.height` (zmierzone w aplikacji:
 * 866 → 554 i 554). Porównanie tych dwóch liczb nie widziało więc klawiatury
 * nigdy i dolny pasek nawigacji wjeżdżał nad nią, zasłaniając pisane pole.
 * Dlatego mierzymy od najwyższego okna widzianego przy tej szerokości: spadek
 * o kawał ekranu to klawiatura, niezależnie od tego, która wysokość zmalała.
 *
 * Returns `true` only while a virtual keyboard is actually up: a plain address
 * bar collapse moves the viewport by far less than the threshold.
 */
export const useVirtualKeyboard = (): boolean => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        // A keyboard eats a large slice of the screen; browser chrome does not.
        const THRESHOLD_RATIO = 0.2;

        // Obrót ekranu zmienia szerokość i wysokość naraz - zaczynamy wtedy pomiar od nowa,
        // inaczej poziome okno (niższe od pionowego) wyglądałoby jak otwarta klawiatura.
        let width = window.innerWidth;
        let fullHeight = window.innerHeight;

        const sync = () => {
            if (window.innerWidth !== width) {
                width = window.innerWidth;
                fullHeight = window.innerHeight;
            }
            fullHeight = Math.max(fullHeight, window.innerHeight);
            const visible = Math.min(window.innerHeight, vv.height);
            setIsOpen(fullHeight - visible > fullHeight * THRESHOLD_RATIO);
        };

        sync();
        vv.addEventListener('resize', sync);
        vv.addEventListener('scroll', sync);
        window.addEventListener('resize', sync);
        return () => {
            vv.removeEventListener('resize', sync);
            vv.removeEventListener('scroll', sync);
            window.removeEventListener('resize', sync);
        };
    }, []);

    return isOpen;
};
