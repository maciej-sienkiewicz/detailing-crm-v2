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

export const Overlay = styled.div<{ $isOpen: boolean; $contentLeft?: number }>`
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.$isOpen ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0)'};
    backdrop-filter: ${props => props.$isOpen ? 'blur(4px)' : 'none'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};
    transition: all ${props => props.theme.transitions.slow};
    animation: ${props => props.$isOpen ? fadeIn : 'none'} 0.3s ease-out;

    /* Center within content area on desktop (exclude sidebar width) */
    @media (min-width: ${props => props.theme.breakpoints.md}) {
        left: ${props => (props.$contentLeft ?? 0)}px;
    }
`;

export const ModalContainer = styled.div<{ $isOpen: boolean }>`
    background: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.xl};
    box-shadow: ${props => props.theme.shadows.xl};
    width: 100%;
    max-width: 28rem;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: ${props => props.$isOpen ? 'scale(1)' : 'scale(0.95)'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    transition: all ${props => props.theme.transitions.slow};
    animation: ${props => props.$isOpen ? scaleIn : 'none'} 0.3s cubic-bezier(0.32, 0.72, 0, 1);
`;

export const Form = styled.form`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
`;

export const Header = styled.div`
    position: relative;
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl} ${props => props.theme.spacing.md};
`;

export const DragHandle = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: ${props => props.theme.spacing.md};
`;

export const DragHandleBar = styled.div`
    width: 48px;
    height: 6px;
    background: ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.full};
`;

export const CloseButton = styled.button`
    position: absolute;
    top: ${props => props.theme.spacing.lg};
    right: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.sm};
    color: ${props => props.theme.colors.textMuted};
    background: transparent;
    border: none;
    border-radius: ${props => props.theme.radii.full};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        color: ${props => props.theme.colors.textSecondary};
        background: ${props => props.theme.colors.surfaceHover};
    }

    svg {
        width: 24px;
        height: 24px;
    }
`;

export const Title = styled.h2`
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0;
`;

export const Content = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl} ${props => props.theme.spacing.lg};
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: ${props => props.theme.colors.border};
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: ${props => props.theme.colors.textMuted};
    }
`;

export const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
`;

export const Label = styled.label`
    display: block;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textSecondary};
    margin-bottom: ${props => props.theme.spacing.sm};
`;

export const Input = styled.input<{ $hasError?: boolean }>`
    width: 100%;
    padding: 10px ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.$hasError ? props.theme.colors.error : 'transparent'};
    border-radius: ${props => props.theme.radii.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    outline: none;
    transition: all ${props => props.theme.transitions.fast};

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }

    &:focus {
        background: ${props => props.theme.colors.surface};
        border-color: ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.primary};
    }
`;

export const ErrorMessage = styled.p`
    margin-top: ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.error};
`;

export const CheckboxContainer = styled.div`
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.md};
`;

export const CheckboxLabel = styled.label`
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.md};
    cursor: pointer;
`;

export const Checkbox = styled.input.attrs({ type: 'checkbox' })`
    margin-top: 2px;
    width: 16px;
    height: 16px;
    border-radius: ${props => props.theme.radii.sm};
    border: 1px solid ${props => props.theme.colors.border};
    cursor: pointer;
    accent-color: ${props => props.theme.colors.primary};

    &:focus {
        outline: 2px solid ${props => props.theme.colors.primary};
        outline-offset: 0;
    }
`;

export const CheckboxContent = styled.div`
    flex: 1;
`;

export const CheckboxTitle = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

export const CheckboxDescription = styled.p`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textSecondary};
    margin-top: ${props => props.theme.spacing.xs};
`;

export const SubmitError = styled.div`
    background: ${props => props.theme.colors.errorLight};
    border: 1px solid #fecaca;
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.error};
`;

export const Footer = styled.div`
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    border-top: 1px solid ${props => props.theme.colors.border};
    background: ${props => props.theme.colors.surface};
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: ${props => props.theme.spacing.md};
`;

export const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: 10px ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    border-radius: ${props => props.theme.radii.full};
    border: none;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    ${props => props.$variant === 'primary' ? `
        color: white;
        background-color: #2563eb;
        box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);

        &:hover:not(:disabled) {
            background-color: #1d4ed8;
            box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.4);
            transform: translateY(-1px);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    ` : `
        color: ${props.theme.colors.textSecondary};
        background: transparent;

        &:hover:not(:disabled) {
            background: ${props.theme.colors.surfaceHover};
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `}
`;
