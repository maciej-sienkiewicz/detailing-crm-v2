import styled from 'styled-components';
import type { ConfirmationVariant } from './ConfirmationModal';
import { ModalOverlay, ModalBox, ModalFooter } from '@/common/styles';

export { ModalOverlay as Overlay };
export { ModalBox as ModalContainer };
export { ModalFooter as Footer };

export const Header = styled.div`
    padding: 32px 28px 24px;
    text-align: center;
    position: relative;
`;

export const CloseButton = styled.button`
    position: absolute;
    top: 20px;
    right: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 50%;
    cursor: pointer;
    color: #64748b;
    transition: all 150ms ease;

    &:hover {
        background: #e2e8f0;
        color: #0f172a;
    }

    svg { width: 16px; height: 16px; }
`;

const iconPalette: Record<ConfirmationVariant, { bg: string; color: string }> = {
    danger:  { bg: '#fee2e2', color: '#dc2626' },
    warning: { bg: '#fef3c7', color: '#d97706' },
    info:    { bg: '#dbeafe', color: '#3b82f6' },
};

export const IconContainer = styled.div<{ $variant: ConfirmationVariant }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 50%;
    background: ${p => iconPalette[p.$variant].bg};
    color: ${p => iconPalette[p.$variant].color};

    svg { width: 28px; height: 28px; stroke-width: 2.5; }
`;

export const Title = styled.h2`
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.1px;
    margin: 0 0 10px;
    line-height: 1.3;
`;

export const Message = styled.p`
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
`;

const confirmPalette: Record<ConfirmationVariant, { bg: string; hover: string }> = {
    danger:  { bg: '#dc2626', hover: '#b91c1c' },
    warning: { bg: '#d97706', hover: '#b45309' },
    info:    { bg: '#0ea5e9', hover: '#0284c7' },
};

export const CancelButton = styled.button`
    flex: 1;
    padding: 11px 20px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #475569;
    background: #f1f5f9;
    border: 1.5px solid #e2e8f0;
    border-radius: 999px;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover {
        background: #e2e8f0;
        color: #0f172a;
        border-color: #cbd5e1;
    }
`;

export const ConfirmButton = styled.button<{ $variant: ConfirmationVariant }>`
    flex: 1;
    padding: 11px 20px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    background: ${p => confirmPalette[p.$variant].bg};
    border: none;
    border-radius: 999px;
    cursor: pointer;
    transition: all 150ms ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);

    &:hover {
        background: ${p => confirmPalette[p.$variant].hover};
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
    }

    &:active { transform: translateY(0); }
`;
