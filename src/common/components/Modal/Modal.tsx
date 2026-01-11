// src/common/components/Modal/Modal.tsx
import styled from 'styled-components';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.lg};
    }
`;

const ModalContainer = styled.div<{ $maxWidth?: string }>`
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.xl};
    width: 100%;
    max-width: ${props => props.$maxWidth || '800px'};
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
`;

const ModalHeader = styled.div`
    padding: ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    display: flex;
    justify-content: space-between;
    align-items: center;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

const ModalTitle = styled.h2`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xxl};
    }
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    font-size: ${props => props.theme.fontSizes.xl};
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    padding: ${props => props.theme.spacing.sm};
    line-height: 1;
    transition: color ${props => props.theme.transitions.fast};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xxl};
    }

    &:hover {
        color: ${props => props.theme.colors.text};
    }
`;

const ModalBody = styled.div`
    padding: ${props => props.theme.spacing.lg};
    overflow-y: auto;
    flex: 1;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}

export const Modal = ({ isOpen, onClose, title, children, maxWidth }: ModalProps) => {
    if (!isOpen) return null;

    return (
        <Overlay onClick={onClose}>
            <ModalContainer $maxWidth={maxWidth} onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>{title}</ModalTitle>
                    <CloseButton onClick={onClose}>×</CloseButton>
                </ModalHeader>
                <ModalBody>
                    {children}
                </ModalBody>
            </ModalContainer>
        </Overlay>
    );
};

// Export styled components dla customizacji
export { ModalBody };