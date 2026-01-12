import styled from 'styled-components';
import { t } from '@/common/i18n';

const Container = styled.div`
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    padding: ${props => props.theme.spacing.xl};
`;

const Spinner = styled.div`
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top-color: ${props => props.theme.colors.primary};
    border-radius: ${props => props.theme.radii.full};
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const LoadingText = styled.p`
    margin-top: ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

export const LoadingScreen = () => {
    return (
        <Container>
            <Spinner />
            <LoadingText>{t.common.loading}</LoadingText>
        </Container>
    );
};
