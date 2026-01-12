// src/modules/auth/components/ErrorAlert.tsx
import styled from 'styled-components';

const AlertContainer = styled.div`
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.theme.colors.errorLight};
    border: 1px solid ${props => props.theme.colors.error};
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.sm};
    animation: slideIn 0.2s ease-out;

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-4px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const IconWrapper = styled.div`
    color: ${props => props.theme.colors.error};
    display: flex;
    align-items: center;
    margin-top: 2px;
`;

const Message = styled.div`
    flex: 1;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.error};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const ErrorIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

interface ErrorAlertProps {
    message: string;
}

export const ErrorAlert = ({ message }: ErrorAlertProps) => {
    return (
        <AlertContainer>
            <IconWrapper>
                <ErrorIcon />
            </IconWrapper>
            <Message>{message}</Message>
        </AlertContainer>
    );
};