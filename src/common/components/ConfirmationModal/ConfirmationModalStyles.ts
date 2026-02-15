import styled, { keyframes } from 'styled-components';
import type { ConfirmationVariant } from './ConfirmationModal';

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

const scaleIn = keyframes`
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
`;

export const Overlay = styled.div<{ $isOpen: boolean }>`
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background-color: ${props => props.$isOpen ? 'rgba(15, 23, 42, 0.5)' : 'rgba(15, 23, 42, 0)'};
    backdrop-filter: ${props => props.$isOpen ? 'blur(4px)' : 'none'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};
    transition: all 0.3s ease;
    animation: ${props => props.$isOpen ? fadeIn : 'none'} 0.3s ease-out;
`;

export const ModalContainer = styled.div<{ $isOpen: boolean }>`
    background: white;
    border-radius: 24px;
    box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, 0.25),
        0 10px 20px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 448px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: ${props => props.$isOpen ? 'scale(1)' : 'scale(0.95)'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    transition: all 0.3s ease;
    animation: ${props => props.$isOpen ? scaleIn : 'none'} 0.3s cubic-bezier(0.32, 0.72, 0, 1);
`;

export const Header = styled.div`
    position: relative;
    padding: 32px 32px 24px;
    text-align: center;
`;

export const DragHandle = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: 20px;

    div {
        width: 48px;
        height: 6px;
        background: #e5e7eb;
        border-radius: 9999px;
    }
`;

export const CloseButton = styled.button`
    position: absolute;
    top: 24px;
    right: 24px;
    padding: 8px;
    color: #9ca3af;
    background: transparent;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        color: #4b5563;
        background: #f3f4f6;
    }

    svg {
        width: 24px;
        height: 24px;
    }
`;

const getIconColors = (variant: ConfirmationVariant) => {
    switch (variant) {
        case 'danger':
            return {
                bg: '#fee2e2',
                color: '#dc2626',
            };
        case 'warning':
            return {
                bg: '#fef3c7',
                color: '#f59e0b',
            };
        case 'info':
            return {
                bg: '#dbeafe',
                color: '#3b82f6',
            };
        default:
            return {
                bg: '#fef3c7',
                color: '#f59e0b',
            };
    }
};

export const IconContainer = styled.div<{ $variant: ConfirmationVariant }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    border-radius: 50%;
    background: ${props => getIconColors(props.$variant).bg};
    color: ${props => getIconColors(props.$variant).color};

    svg {
        width: 32px;
        height: 32px;
        stroke-width: 2.5;
    }
`;

export const Title = styled.h2`
    font-size: 20px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 12px;
    line-height: 1.3;
`;

export const Message = styled.p`
    font-size: 15px;
    color: #6b7280;
    margin: 0;
    line-height: 1.5;
`;

export const Footer = styled.div`
    display: flex;
    gap: 12px;
    padding: 0 32px 32px;
`;

export const CancelButton = styled.button`
    flex: 1;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 500;
    color: #374151;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: #f9fafb;
        border-color: #9ca3af;
    }

    &:active {
        transform: scale(0.98);
    }
`;

const getConfirmButtonColors = (variant: ConfirmationVariant) => {
    switch (variant) {
        case 'danger':
            return {
                bg: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                hoverBg: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
            };
        case 'warning':
            return {
                bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                hoverBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            };
        case 'info':
            return {
                bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                hoverBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            };
        default:
            return {
                bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                hoverBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            };
    }
};

export const ConfirmButton = styled.button<{ $variant: ConfirmationVariant }>`
    flex: 1;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 500;
    color: white;
    background: ${props => getConfirmButtonColors(props.$variant).bg};
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

    &:hover {
        background: ${props => getConfirmButtonColors(props.$variant).hoverBg};
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        transform: translateY(-1px);
    }

    &:active {
        transform: scale(0.98) translateY(0);
    }
`;
