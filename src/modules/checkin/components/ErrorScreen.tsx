import styled from 'styled-components';

const Container = styled.div`
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
`;

const ErrorIcon = styled.div`
    width: 80px;
    height: 80px;
    border-radius: ${props => props.theme.radii.full};
    background-color: rgba(220, 38, 38, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: ${props => props.theme.spacing.lg};

    svg {
        width: 40px;
        height: 40px;
        color: #fca5a5;
    }
`;

const ErrorTitle = styled.h1`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    margin: 0 0 ${props => props.theme.spacing.sm} 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xxl};
    }
`;

const ErrorMessage = styled.p`
    font-size: ${props => props.theme.fontSizes.md};
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
`;

interface ErrorScreenProps {
    title: string;
    message: string;
}

export const ErrorScreen = ({ title, message }: ErrorScreenProps) => {
    return (
        <Container>
            <ErrorIcon>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </ErrorIcon>
            <ErrorTitle>{title}</ErrorTitle>
            <ErrorMessage>{message}</ErrorMessage>
        </Container>
    );
};