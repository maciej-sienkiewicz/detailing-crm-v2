import styled, { keyframes } from 'styled-components';

/**
 * Tło ekranów logowania, rejestracji i resetu hasła - to samo, co na stronie
 * detailboost.pl, z której się tu przychodzi: niemal czarna scena (#08080a), ciepła
 * złota poświata u góry, chłodny kontrapunkt z boku i siatka kropek co 22 px, która
 * gaśnie ku krawędziom. Bez tego przejście ze strony na formularz było skokiem
 * z czerni i złota w granatowy gradient innej aplikacji.
 *
 * Tylko CSS, bez płótna i skryptu: poświaty dryfują bardzo wolno (jak na stronie),
 * a przy ograniczonym ruchu stoją.
 */
const drift = keyframes`
    from { transform: translate3d(-4%, -3%, 0) scale(1); }
    to { transform: translate3d(4%, 2%, 0) scale(1.08); }
`;

export const AuthContainer = styled.div`
    position: relative;
    isolation: isolate;
    overflow: hidden;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.lg};
    background: #08080a;

    /* Poświaty: złota nad formularzem, chłodna z lewej. */
    &::before {
        content: '';
        position: absolute;
        inset: -20% -10%;
        z-index: -2;
        pointer-events: none;
        background:
            radial-gradient(ellipse 45% 38% at 50% 12%, rgba(220, 174, 92, 0.2), transparent 70%),
            radial-gradient(ellipse 35% 40% at 8% 55%, rgba(200, 210, 230, 0.07), transparent 70%);
        filter: blur(8px);
        animation: ${drift} 26s ease-in-out infinite alternate;
    }

    /* Siatka kropek jak na stronie, gasnąca od środka ku krawędziom. */
    &::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        background-image: radial-gradient(rgba(244, 244, 242, 0.11) 1px, transparent 1.3px);
        background-size: 22px 22px;
        background-position: center;
        mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 78%);
        -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 78%);
    }

    @media (prefers-reduced-motion: reduce) {
        &::before {
            animation: none;
        }
    }
`;

/**
 * Cień karty formularza: głęboki i ciemny, ze złotą poświatą pod spodem - jak główny
 * przycisk na stronie. Jasna karta „stoi" na scenie zamiast wisieć w próżni.
 */
export const authCardShadow =
    '0 0 0 1px rgba(255, 255, 255, 0.06), 0 40px 90px -30px rgba(0, 0, 0, 0.9), 0 30px 80px -40px rgba(220, 174, 92, 0.45)';
