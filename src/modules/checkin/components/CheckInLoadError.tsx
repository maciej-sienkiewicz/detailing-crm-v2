// src/modules/checkin/components/CheckInLoadError.tsx
//
// Ekran „nie da się zacząć przyjęcia" - zawsze z drogą dalej.
//
// Dawniej nieudany odczyt kolorów wizyt kończył się napisem „Nie udało się wczytać
// rezerwacji / Nie znaleziono rezerwacji" (albo surowym angielskim error.message) i niczym
// więcej: bez ponowienia i bez powrotu. Sprzedawca z klientem przy ladzie mógł tylko
// odświeżyć stronę na ślepo. Tu jest „Spróbuj ponownie" (tylko to, co się nie wczytało)
// i „Wróć do kalendarza".

import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/common/components/ui';

const ErrorContainer = styled.div`
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: ${props => props.theme.colors.background};
    padding: ${props => props.theme.spacing.xl} 16px;
    text-align: center;
`;

const ErrorIcon = styled.div<{ $tone: 'error' | 'warning' }>`
    width: 80px;
    height: 80px;
    border-radius: ${props => props.theme.radii.full};
    background-color: ${props => (props.$tone === 'error' ? props.theme.colors.errorLight : 'rgba(234, 179, 8, 0.12)')};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: ${props => props.theme.spacing.lg};

    svg {
        width: 40px;
        height: 40px;
        color: ${props => (props.$tone === 'error' ? props.theme.colors.error : '#CA8A04')};
    }
`;

const ErrorTitle = styled.h1`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.sm} 0;
`;

const ErrorMessage = styled.p`
    max-width: 460px;
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.textSecondary};
    margin: 0;
`;

const Actions = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: ${props => props.theme.spacing.lg};
`;

interface CheckInLoadErrorProps {
    title: string;
    message: string;
    /** Ponowienie tego, co się nie wczytało. Bez niego - tylko powrót (np. rezerwacji nie ma). */
    onRetry?: () => void;
    isRetrying?: boolean;
    /** Ostrzeżenie zamiast błędu: nic nie zawiodło, tylko tej rezerwacji nie da się przyjąć. */
    tone?: 'error' | 'warning';
}

export const CheckInLoadError = ({ title, message, onRetry, isRetrying = false, tone = 'error' }: CheckInLoadErrorProps) => {
    const navigate = useNavigate();

    return (
        <ErrorContainer role="alert">
            <ErrorIcon $tone={tone}>
                {tone === 'error' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                )}
            </ErrorIcon>
            <ErrorTitle>{title}</ErrorTitle>
            <ErrorMessage>{message}</ErrorMessage>
            <Actions>
                {/* Jedno wypełnienie: ponowienie, gdy jest; inaczej powrót jest krokiem następnym. */}
                {onRetry && (
                    <Button variant="primary" onClick={onRetry} disabled={isRetrying}>
                        {isRetrying ? 'Wczytywanie…' : 'Spróbuj ponownie'}
                    </Button>
                )}
                <Button variant={onRetry ? 'outline' : 'primary'} onClick={() => navigate('/calendar')}>
                    Wróć do kalendarza
                </Button>
            </Actions>
        </ErrorContainer>
    );
};
