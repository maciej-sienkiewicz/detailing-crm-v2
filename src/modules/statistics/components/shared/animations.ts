// src/modules/statistics/components/shared/animations.ts
// Wspólne animacje wejścia dla kart statystyk.
import { css, keyframes } from 'styled-components';

export const fadeInUp = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
`;

/** Delikatne "wjechanie" kart przy wejściu na stronę (wyłączane przy
    prefers-reduced-motion). */
export const cardEntrance = css`
    animation: ${fadeInUp} 0.4s ease both;
    @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
