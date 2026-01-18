import { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';

const slideIn = keyframes`
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
`;

const slideOut = keyframes`
    from {
        transform: translateY(0);
        opacity: 1;
    }
    to {
        transform: translateY(100%);
        opacity: 0;
    }
`;

const ToastContainer = styled.div<{ $variant: 'success' | 'error' | 'info' | 'warning'; $isClosing: boolean }>`
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: ${props => {
        switch (props.$variant) {
            case 'success': return props.theme.colors.success || '#10b981';
            case 'error': return props.theme.colors.error;
            case 'warning': return props.theme.colors.warning;
            case 'info':
            default: return props.theme.colors.primary;
        }
    }};
    color: white;
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.xl};
    min-width: 320px;
    max-width: 500px;
    animation: ${props => props.$isClosing ? slideOut : slideIn} 0.3s ease;

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        left: 16px;
        right: 16px;
        bottom: 16px;
        min-width: auto;
    }
`;

const IconContainer = styled.div`
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 24px;
        height: 24px;
    }
`;

const Content = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const Title = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    line-height: 1.4;
`;

const Message = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    opacity: 0.9;
    line-height: 1.4;
`;

const CloseButton = styled.button`
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: white;
    cursor: pointer;
    border-radius: ${props => props.theme.radii.sm};
    opacity: 0.8;
    transition: opacity 0.2s ease, background 0.2s ease;

    &:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

interface ToastProps {
    title: string;
    message?: string;
    variant?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    onClose: () => void;
}

export const Toast = ({
    title,
    message,
    variant = 'info',
    duration = 4000,
    onClose,
}: ToastProps) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300); // Match animation duration
    };

    const getIcon = () => {
        switch (variant) {
            case 'success':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'error':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'info':
            default:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    return (
        <ToastContainer $variant={variant} $isClosing={isClosing}>
            <IconContainer>{getIcon()}</IconContainer>
            <Content>
                <Title>{title}</Title>
                {message && <Message>{message}</Message>}
            </Content>
            <CloseButton onClick={handleClose}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </CloseButton>
        </ToastContainer>
    );
};
