// src/modules/settings/components/phone/motion.ts
//
// Ruch w Ustawienia → Telefon, na Web Animations API zamiast biblioteki.
//
// Przejścia mają pokazać, SKĄD i DOKĄD się idzie: ekran telefonu ucieka w stronę,
// z której przyszedł wybór, ustawienia wjeżdżają z prawej, a „Wróć" cofa je w lewo.
// Kto ma w systemie „ogranicz ruch", dostaje natychmiastową zmianę - tak samo jak
// w TabBar i PickerList. W jsdom nie ma `Element.animate`, więc testy też idą bez ruchu.

/** Wyjście i wejście: szybki start, miękkie lądowanie. */
export const EASE_OUT = 'cubic-bezier(.2, .8, .2, 1)';
/** Lekkie przestrzelenie - znacznik w składzie, przełączniki, wpadające powiadomienie. */
export const SPRING = 'cubic-bezier(.34, 1.56, .64, 1)';

export const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animacja albo null, gdy ruchu nie będzie (ograniczony ruch, brak elementu, brak API). */
export const animate = (
    element: Element | null | undefined,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
): Animation | null => {
    if (!element || typeof element.animate !== 'function' || prefersReducedMotion()) return null;
    return element.animate(keyframes, { easing: EASE_OUT, ...options });
};

/** Koniec animacji; przerwana (`cancel`) też się kończy, tylko bez wyjątku. */
export const finished = (animation: Animation | null): Promise<void> =>
    animation ? animation.finished.then(() => undefined, () => undefined) : Promise.resolve();

/**
 * Wejście dzieci kontenera po kolei. `fill: 'backwards'` trzyma je w stanie
 * początkowym w czasie opóźnienia - bez tego mignęłyby w miejscu docelowym.
 */
export const staggerIn = (
    container: Element | null | undefined,
    from: Keyframe,
    { duration = 380, step = 50, delay = 0, easing = EASE_OUT }: { duration?: number; step?: number; delay?: number; easing?: string } = {},
): void => {
    if (!container) return;
    Array.from(container.children).forEach((child, index) => {
        animate(child, [from, { opacity: 1, transform: 'none' }], {
            duration,
            delay: delay + index * step,
            easing,
            fill: 'backwards',
        });
    });
};

/** Zdejmuje z elementu animacje trzymające stan końcowy (`fill: 'forwards'`). */
export const clearAnimations = (element: Element | null | undefined): void => {
    element?.getAnimations?.().forEach(animation => animation.cancel());
};
