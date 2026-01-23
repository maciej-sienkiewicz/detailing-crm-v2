import styled, { keyframes } from 'styled-components';

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
    padding: 24px 32px 16px;
`;

export const DragHandle = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: 16px;

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

export const Title = styled.h2`
    font-size: 24px;
    font-weight: 600;
    color: #111827;
    margin: 0;
`;

export const Subtitle = styled.p`
    font-size: 14px;
    color: #6b7280;
    margin: 8px 0 0 0;
`;

export const Content = styled.div`
    padding: 16px 32px;
`;

export const ServiceInfoBox = styled.div`
    margin-bottom: 24px;
    padding: 16px;
    background: #eff6ff;
    border: 1px solid #dbeafe;
    border-radius: 12px;
`;

export const ServiceInfoLabel = styled.p`
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    margin: 0 0 4px 0;
`;

export const ServiceInfoName = styled.p`
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0;
`;

export const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
`;

export const Label = styled.label`
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
`;

export const PriceInputWrapper = styled.div`
    position: relative;
`;

export const PriceInput = styled.input`
    width: 100%;
    padding: 12px 48px 12px 16px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    font-size: 18px;
    color: #111827;
    outline: none;
    transition: all 0.2s ease;

    &::placeholder {
        color: #9ca3af;
    }

    &:focus {
        background: white;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
`;

export const PriceCurrency = styled.span`
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
`;

export const ErrorMessage = styled.p`
    margin: 8px 0 0 0;
    font-size: 14px;
    color: #ef4444;
`;

export const Footer = styled.div`
    padding: 24px 32px;
    border-top: 1px solid #f3f4f6;
    background: white;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    flex-shrink: 0;
`;

export const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: 10px 24px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    ${props => {
        if (props.$variant === 'secondary') {
            return `
                color: #374151;
                background: transparent;

                &:hover {
                    background: #f3f4f6;
                }
            `;
        } else {
            // primary
            return `
                color: white;
                background-color: #3b82f6;
                box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);

                &:hover {
                    background-color: #2563eb;
                    box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.4);
                    transform: translateY(-1px);
                }

                &:active {
                    transform: translateY(0);
                }
            `;
        }
    }}
`;
