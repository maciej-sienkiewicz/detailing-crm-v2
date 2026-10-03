import type { ReactNode } from 'react';
import styled, { keyframes, ThemeProvider, type DefaultTheme } from 'styled-components';
import { theme } from '@/common/theme';
import { AuthDotField } from './AuthDotField';

/**
 * Ekrany logowania, rejestracji i resetu hasła w scenie strony detailboost.pl, z której
 * się tu przychodzi: niemal czarne tło, złota poświata u góry, chłodna z boku i ta sama
 * żywa siatka kropek co na stronie, tylko bledsza. Karta formularza jest ciemną szybą,
 * nie jasnym prostokątem - biała karta na czarnym tle raziła w oczy.
 *
 * Ciemne kolory idą przez nadpisanie motywu tylko w tym poddrzewie: pola, etykiety,
 * alerty i linki modułu auth biorą kolory z `theme.colors`, więc wystarczy podmienić
 * paletę, a reszta aplikacji zostaje jasna.
 */
const dark: DefaultTheme = {
    ...theme,
    colors: {
        ...theme.colors,
        background: '#08080a',
        surface: 'rgba(17, 17, 20, 0.78)',
        surfaceAlt: 'rgba(255, 255, 255, 0.06)',
        surfaceHover: 'rgba(255, 255, 255, 0.035)',
        text: '#f4f4f2',
        textSecondary: '#a1a1aa',
        textMuted: '#71717a',
        border: 'rgba(255, 255, 255, 0.12)',
        primary: '#dcae5c',
        error: '#f87171',
        errorLight: 'rgba(248, 113, 113, 0.1)',
        success: '#4ade80',
        successLight: 'rgba(74, 222, 128, 0.1)',
        // Motyw ma kolory typowane jako dosłowne wartości jasnej palety (`as const`);
        // ciemna paleta ma te same klucze, inne wartości.
    } as unknown as DefaultTheme['colors'],
};

const drift = keyframes`
    from { transform: translate3d(-4%, -3%, 0) scale(1); }
    to { transform: translate3d(4%, 2%, 0) scale(1.08); }
`;

const Scene = styled.div`
    position: relative;
    isolation: isolate;
    overflow: hidden;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.lg};
    background: #08080a;
    color: #f4f4f2;

    /* Poświaty: złota nad formularzem, chłodna z lewej. */
    &::before {
        content: '';
        position: absolute;
        inset: -20% -10%;
        z-index: -2;
        pointer-events: none;
        background:
            radial-gradient(ellipse 45% 38% at 50% 12%, rgba(220, 174, 92, 0.16), transparent 70%),
            radial-gradient(ellipse 35% 40% at 8% 55%, rgba(200, 210, 230, 0.06), transparent 70%);
        filter: blur(8px);
        animation: ${drift} 26s ease-in-out infinite alternate;
    }

    /* Główny przycisk formularza jak na stronie: biały, ze złotą poświatą. Wspólny
       Button aplikacji ma niebieski gradient - tu, na ciemnej scenie, byłby obcy. */
    && button[type='submit'] {
        background: #ffffff;
        color: #0a0709;
        box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.6), 0 14px 34px -12px rgba(220, 174, 92, 0.8);
    }
    && button[type='submit']:hover:not(:disabled) {
        background: #f6efd2;
        transform: translateY(-1px);
        box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.6), 0 16px 40px -10px rgba(220, 174, 92, 0.95);
    }

    @media (prefers-reduced-motion: reduce) {
        &::before {
            animation: none;
        }
    }
`;

/** Siatka kropek gaśnie ku krawędziom, jak pod nagłówkiem strony. */
const Dots = styled.div`
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    mask-image: radial-gradient(ellipse 75% 65% at 50% 40%, #000 35%, transparent 80%);
    -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 40%, #000 35%, transparent 80%);
`;

export function AuthContainer({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider theme={dark}>
            <Scene>
                <Dots>
                    <AuthDotField strength={0.45} />
                </Dots>
                {children}
            </Scene>
        </ThemeProvider>
    );
}
