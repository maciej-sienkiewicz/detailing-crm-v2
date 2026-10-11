// src/core/components/NavigationProgress.tsx
//
// Cienki pasek u góry ekranu na czas pobierania kodu następnego widoku.
//
// Widoki ładują się przez `route.lazy` (core/router.tsx): po kliknięciu w menu router
// trzyma poprzedni ekran, dopóki kod nowego nie przyjdzie. Z kodem w pamięci podręcznej
// to ułamek sekundy, ale przy pierwszym wejściu na ciężki ekran (kalendarz, statystyki)
// na słabym LTE bywa to sekunda - bez znaku życia kliknięcie wyglądałoby na zignorowane.
// Opóźnienie pokazania (w CSS, bez stanu): przy szybkim przejściu pasek znika, zanim
// się pojawi, zamiast mignąć.
import { useNavigation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

const SHOW_AFTER_MS = 150;

const appear = keyframes`
    to { opacity: 1; }
`;

const slide = keyframes`
    from { transform: translateX(-100%); }
    to { transform: translateX(250%); }
`;

const Track = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    z-index: 10000;
    overflow: hidden;
    pointer-events: none;
    opacity: 0;
    animation: ${appear} 0s linear ${SHOW_AFTER_MS}ms forwards;

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        width: 40%;
        background: ${p => p.theme.colors.primary};
        animation: ${slide} 1.1s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
        &::after {
            animation: none;
            width: 100%;
            opacity: 0.6;
        }
    }
`;

export function NavigationProgress() {
    const loading = useNavigation().state !== 'idle';
    return loading ? <Track role="progressbar" aria-label="Wczytywanie widoku" /> : null;
}
