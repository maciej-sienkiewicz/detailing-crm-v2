/**
 * Shared button primitives: Stitch-inspired design system
 */
import styled from 'styled-components';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const sizeStyles: Record<ButtonSize, string> = {
    sm:  'padding: 7px 16px;  font-size: 13px;',
    md:  'padding: 10px 22px; font-size: 14px;',
    lg:  'padding: 13px 28px; font-size: 16px;',
};

const variantStyles = (variant: ButtonVariant) => {
    switch (variant) {
        case 'primary':
            return `
                color: #ffffff;
                background: #0369a1;
                box-shadow: 0 2px 6px rgba(3,105,161,0.22);

                &:hover:not(:disabled) {
                    background: #075985;
                    box-shadow: 0 4px 10px rgba(3,105,161,0.28);
                    transform: translateY(-1px);
                }
                &:active:not(:disabled) {
                    transform: translateY(0);
                    box-shadow: 0 2px 6px rgba(3,105,161,0.22);
                }
                &:disabled {
                    background: #bae6fd;
                    box-shadow: none;
                    cursor: not-allowed;
                    transform: none;
                }
            `;
        case 'secondary':
            return `
                color: var(--ui-text-secondary);
                background: var(--ui-surface-alt);
                border: 1.5px solid var(--ui-line);

                &:hover:not(:disabled) {
                    background: var(--ui-line);
                    color: var(--ui-ink);
                    border-color: var(--ui-line-hover);
                }
                &:disabled { opacity: 0.5; cursor: not-allowed; }
            `;
        case 'ghost':
            return `
                color: var(--ui-text-secondary);
                background: transparent;

                &:hover:not(:disabled) {
                    background: var(--ui-surface-alt);
                    color: var(--ui-ink);
                }
                &:disabled { opacity: 0.5; cursor: not-allowed; }
            `;
        case 'danger':
            return `
                color: #ffffff;
                background: #ef4444;
                box-shadow: 0 2px 8px rgba(239,68,68,0.28);

                &:hover:not(:disabled) {
                    background: #dc2626;
                    box-shadow: 0 4px 14px rgba(239,68,68,0.38);
                    transform: translateY(-1px);
                }
                &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
            `;
        default:
            return '';
    }
};

export const SharedButton = styled.button<{
    $variant?: ButtonVariant;
    $size?: ButtonSize;
}>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: inherit;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 180ms ease;
    white-space: nowrap;
    border-radius: 10px;
    line-height: 1;

    ${p => sizeStyles[p.$size ?? 'md']}
    ${p => variantStyles(p.$variant ?? 'primary')}
`;

export const SharedButtonGroup = styled.div<{ $align?: 'left' | 'right' | 'center' | 'between' }>`
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: ${p => {
        if (p.$align === 'left')    return 'flex-start';
        if (p.$align === 'center')  return 'center';
        if (p.$align === 'between') return 'space-between';
        return 'flex-end';
    }};
`;
