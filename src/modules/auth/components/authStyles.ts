import { css } from 'styled-components';

/**
 * Karta formularza: ciemna szyba z rozmyciem tła, cienka jasna krawędź i głęboki cień
 * ze złotą poświatą pod spodem - jak główny przycisk na stronie.
 */
export const authCard = css`
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
        inset 0 1px 0 0 rgba(255, 255, 255, 0.05),
        0 40px 90px -30px rgba(0, 0, 0, 0.9),
        0 30px 80px -40px rgba(220, 174, 92, 0.35);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
`;

/** Kafelek z literą „D": ciemne szkło i złota litera zamiast jaskrawego niebieskiego. */
export const authLogo = css`
    background: linear-gradient(180deg, #1c1c20, #0d0d10);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #ecd08f;
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 12px 30px -12px rgba(220, 174, 92, 0.5);
`;

/** Kolor linku po najechaniu - jaśniejsze złoto zamiast niebieskiego #0284c7. */
export const authLinkHover = '#f6efd2';
