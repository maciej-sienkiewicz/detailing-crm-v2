// src/modules/auth/components/SuccessAlert.tsx
import styled from 'styled-components';

const AlertContainer = styled.div`
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.theme.colors.successLight};
    border: 1px solid ${props => props.theme.colors.success};
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
    color: ${props => props.theme.colors.success};
    display: flex;
    align-items: center;
    margin-top: 2px;
`;

const Message = styled.div`
    flex: 1;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.success};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const SuccessIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

interface SuccessAlertProps {
    message: string;
}

export const SuccessAlert = ({ message }: SuccessAlertProps) => {
    return (
        <AlertContainer>
            <IconWrapper>
                <SuccessIcon />
            </IconWrapper>
            <Message>{message}</Message>
        </AlertContainer>
    );
};
