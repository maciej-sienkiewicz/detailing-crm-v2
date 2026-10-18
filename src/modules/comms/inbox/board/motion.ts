// src/modules/comms/inbox/board/motion.ts
// Ruch tablicy spraw - jedna krzywa i jedne czasy dla wszystkiego, co się przesuwa.
//
// Krzywa to „sprężyna bez odbicia" z arkuszy iOS (0.32, 0.72, 0, 1): szybki start
// i długie, miękkie dociągnięcie. Odbicie (overshoot) wygląda efektownie raz, a przy
// dwudziestu kartach robiących miejsce naraz zamienia tablicę w galaretę.

export const EASE_SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)';
/** Zamykanie jest krótsze i bardziej zdecydowane niż otwieranie - jak w macOS. */
export const EASE_OUT = 'cubic-bezier(0.4, 0, 0.2, 1)';

export const DURATION = {
    /** Karty robiące miejsce. */
    shift: 420,
    /** Karta wracająca z ręki na miejsce. */
    drop: 340,
    /** Okno sprawy wyrastające z karty. */
    open: 520,
    close: 360,
} as const;

export const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
