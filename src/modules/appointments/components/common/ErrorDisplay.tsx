
// src/modules/appointments/components/common/ErrorDisplay.tsx
import styled from 'styled-components';
import { t } from '@/common/i18n';

const Container = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background-color: ${props => props.theme.colors.errorLight};
    border: 2px solid ${props => props.theme.colors.error};
    border-radius: ${props => props.theme.radii.md};
    text-align: center;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

const ErrorText = styled.p`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.error};
    margin: 0;
    font-weight: ${props => props.theme.fontWeights.medium};
`;

interface ErrorDisplayProps {
    message?: string;
}

export const ErrorDisplay = ({ message }: ErrorDisplayProps) => {
    return (
        <Container>
            <ErrorText>{message || t.common.error}</ErrorText>
        </Container>
    );
};