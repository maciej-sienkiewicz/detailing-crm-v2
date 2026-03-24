/**
 * Shared button primitives — Stitch-inspired design system
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
                background: #0ea5e9;
                box-shadow: 0 2px 8px rgba(14,165,233,0.28);

                &:hover:not(:disabled) {
                    background: #0284c7;
                    box-shadow: 0 4px 14px rgba(14,165,233,0.38);
                    transform: translateY(-1px);
                }
                &:active:not(:disabled) {
                    transform: translateY(0);
                    box-shadow: 0 2px 6px rgba(14,165,233,0.22);
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
                color: #475569;
                background: #f1f5f9;
                border: 1.5px solid #e2e8f0;

                &:hover:not(:disabled) {
                    background: #e2e8f0;
                    color: #0f172a;
                    border-color: #cbd5e1;
                }
                &:disabled { opacity: 0.5; cursor: not-allowed; }
            `;
        case 'ghost':
            return `
                color: #475569;
                background: transparent;

                &:hover:not(:disabled) {
                    background: #f1f5f9;
                    color: #0f172a;
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
    border-radius: 999px;
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
