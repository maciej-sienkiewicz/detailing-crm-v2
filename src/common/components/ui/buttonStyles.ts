// src/common/components/ui/buttonStyles.ts
//
// Metryka i warianty przycisku - osobno od komponentu, bo z tego samego stylu
// korzystają <button>, <label> (wybór pliku) i <a> (tel:, mailto:).

import { css } from 'styled-components';
import { touch, ui } from './tokens';

export type ButtonVariant =
    | 'primary' | 'success' | 'tinted' | 'tintedSuccess' | 'outline' | 'ghost' | 'danger' | 'onDark';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonStyleProps {
    $variant: ButtonVariant;
    $size: ButtonSize;
    $block?: boolean;
    $iconOnly?: boolean;
}

export const BUTTON_SIZES: Record<ButtonSize, { height: number; padding: number; font: number; icon: number }> = {
    sm: { height: 30, padding: 11, font: 12.5, icon: 14 },
    md: { height: 36, padding: 14, font: 13.5, icon: 15 },
    lg: { height: 40, padding: 18, font: 14, icon: 16 },
};

const VARIANTS: Record<ButtonVariant, ReturnType<typeof css>> = {
    primary: css`
        border-color: transparent;
        background: linear-gradient(135deg, ${ui.brandStrong}, ${ui.brandInk});
        color: #fff;
        box-shadow: 0 4px 12px rgba(3, 105, 161, 0.25);
        &:hover:not(:disabled) { box-shadow: 0 6px 16px rgba(3, 105, 161, 0.32); }
    `,
    success: css`
        border-color: transparent;
        background: linear-gradient(135deg, #16a34a, ${ui.okInk});
        color: #fff;
        box-shadow: 0 4px 14px rgba(21, 128, 61, 0.32);
        &:hover:not(:disabled) { box-shadow: 0 6px 18px rgba(21, 128, 61, 0.4); }
    `,
    tinted: css`
        border-color: ${ui.brandLine};
        background: ${ui.brandTint};
        color: ${ui.brandDeep};
        &:hover:not(:disabled) { background: ${ui.brandTintHover}; }
    `,
    tintedSuccess: css`
        border-color: ${ui.okLine};
        background: ${ui.okTint};
        color: ${ui.okInk};
        &:hover:not(:disabled) { background: ${ui.okTintHover}; border-color: #4ade80; }
    `,
    outline: css`
        border-color: ${ui.line};
        background: ${ui.surface};
        color: ${ui.inkSoft};
        &:hover:not(:disabled) { border-color: ${ui.lineStrong}; color: ${ui.ink}; }
    `,
    ghost: css`
        border-color: transparent;
        background: transparent;
        color: ${ui.textSecondary};
        &:hover:not(:disabled) { background: ${ui.surfaceAlt}; color: ${ui.ink}; }
    `,
    danger: css`
        border-color: transparent;
        background: transparent;
        color: ${ui.dangerInk};
        &:hover:not(:disabled) { background: ${ui.dangerTint}; }
    `,
    onDark: css`
        border-color: rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.08);
        color: #f1f5f9;
        &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.16); }
    `,
};

/**
 * Styl przycisku bez elementu - dla `<label>` z ukrytym `<input type="file">`
 * („Dodaj plik") i dla odnośników `<a>` („Zadzwoń"), które mają wyglądać
 * dokładnie jak przycisk obok.
 */
export const buttonStyles = css<ButtonStyleProps>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    box-sizing: border-box;
    height: ${p => BUTTON_SIZES[p.$size].height}px;
    ${p => p.$iconOnly
        ? css`width: ${BUTTON_SIZES[p.$size].height}px; padding: 0;`
        : css`padding: 0 ${BUTTON_SIZES[p.$size].padding}px;`}
    ${p => p.$block && css`width: 100%;`}
    border: 1px solid transparent;
    border-radius: ${ui.radiusControl};
    font-family: inherit;
    font-size: ${p => BUTTON_SIZES[p.$size].font}px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    user-select: none;
    transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease, color 150ms ease;
    -webkit-tap-highlight-color: transparent;

    svg { width: ${p => BUTTON_SIZES[p.$size].icon}px; height: ${p => BUTTON_SIZES[p.$size].icon}px; flex-shrink: 0; }

    ${p => VARIANTS[p.$variant]}

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
    &:disabled, &[aria-disabled='true'] { opacity: 0.5; cursor: not-allowed; }

    ${touch} {
        height: 44px;
        ${p => p.$iconOnly && css`width: 44px;`}
    }
`;

