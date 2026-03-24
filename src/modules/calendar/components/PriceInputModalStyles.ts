import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const scaleIn = keyframes`
    from { opacity: 0; transform: scale(0.97) translateY(4px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
`;

export const Overlay = styled.div<{ $isOpen: boolean }>`
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background-color: ${props => props.$isOpen ? 'rgba(15, 23, 42, 0.45)' : 'rgba(15, 23, 42, 0)'};
    backdrop-filter: ${props => props.$isOpen ? 'blur(4px)' : 'none'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};
    transition: all ${props => props.theme.transitions.slow};
    animation: ${props => props.$isOpen ? fadeIn : 'none'} 0.25s ease-out;
`;

export const ModalContainer = styled.div<{ $isOpen: boolean }>`
    background: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.xl};
    box-shadow:
        0 0 0 1px rgba(0,0,0,0.06),
        0 8px 16px -4px rgba(0,0,0,0.08),
        0 24px 48px -12px rgba(0,0,0,0.14);
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: ${props => props.$isOpen ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(4px)'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    transition: all ${props => props.theme.transitions.slow};
    animation: ${props => props.$isOpen ? scaleIn : 'none'} 0.25s cubic-bezier(0.32, 0.72, 0, 1);
`;

export const Header = styled.div`
    position: relative;
    padding: 20px 24px 16px;
`;

export const DragHandle = styled.div`display: none;`;

export const CloseButton = styled.button`
    position: absolute;
    top: 20px;
    right: 20px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.theme.colors.textMuted};
    background: transparent;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        color: ${props => props.theme.colors.textSecondary};
        background: ${props => props.theme.colors.surfaceAlt};
    }

    svg { width: 18px; height: 18px; }
`;

export const Title = styled.h2`
    font-size: 18px;
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: -0.3px;
    margin: 0 0 2px;
`;

export const Subtitle = styled.p`
    font-size: 13px;
    color: ${props => props.theme.colors.textMuted};
    margin: 0;
`;

export const Content = styled.div`
    padding: 4px 24px 20px;
`;

export const ServiceInfoBox = styled.div`
    margin-bottom: 20px;
    padding: 14px 16px;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
`;

export const ServiceInfoLabel = styled.p`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${props => props.theme.colors.textMuted};
    margin: 0 0 4px;
`;

export const ServiceInfoName = styled.p`
    font-size: 17px;
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: -0.2px;
    margin: 0;
`;

export const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const Label = styled.label`
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

export const PriceInputWrapper = styled.div`
    position: relative;
`;

export const PriceInput = styled.input`
    width: 100%;
    padding: 12px 48px 12px 14px;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid transparent;
    border-radius: ${props => props.theme.radii.md};
    font-size: 20px;
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    font-variant-numeric: tabular-nums;
    outline: none;
    transition: all ${props => props.theme.transitions.fast};

    &::placeholder { color: ${props => props.theme.colors.border}; }

    &:focus {
        background: ${props => props.theme.colors.surface};
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

export const PriceCurrency = styled.span`
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
`;

export const ErrorMessage = styled.p`
    margin: 4px 0 0;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.error};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

export const Footer = styled.div`
    padding: 14px 24px;
    border-top: 1px solid ${props => props.theme.colors.border};
    background: ${props => props.theme.colors.surface};
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-shrink: 0;
`;

export const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: 8px 20px;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    border-radius: ${props => props.theme.radii.full};
    border: none;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    white-space: nowrap;

    ${props => props.$variant === 'secondary' ? `
        color: ${props.theme.colors.textSecondary};
        background: transparent;
        &:hover:not(:disabled) { color: ${props.theme.colors.text}; background: ${props.theme.colors.surfaceAlt}; }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
    ` : `
        color: white;
        background-color: var(--button-bg, ${props.theme.colors.primary});
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.28);
        &:hover:not(:disabled) {
            background-color: #0284c7;
            box-shadow: 0 6px 16px rgba(14, 165, 233, 0.36);
            transform: translateY(-1px);
        }
        &:active { transform: translateY(0); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
    `}
`;
