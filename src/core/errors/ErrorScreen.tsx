// src/core/errors/ErrorScreen.tsx
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { Button, ButtonGroup } from '@/common/components/Button';

const Screen = styled.div`
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${p => p.theme.spacing.lg};
    background: ${p => p.theme.colors.background};
    color: ${p => p.theme.colors.text};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const Card = styled.div`
    width: 100%;
    max-width: 480px;
    padding: ${p => p.theme.spacing.xl};
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: ${p => p.theme.shadows.md};
    text-align: center;
`;

const Icon = styled.div`
    font-size: 40px;
    line-height: 1;
    margin-bottom: ${p => p.theme.spacing.md};
`;

const Title = styled.h1`
    font-size: ${p => p.theme.fontSizes.xl};
    font-weight: ${p => p.theme.fontWeights.semibold};
    margin-bottom: ${p => p.theme.spacing.sm};
`;

const Description = styled.p`
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textSecondary};
    margin-bottom: ${p => p.theme.spacing.lg};
`;

const Details = styled.details`
    margin-top: ${p => p.theme.spacing.lg};
    text-align: left;

    summary {
        cursor: pointer;
        font-size: ${p => p.theme.fontSizes.xs};
        color: ${p => p.theme.colors.textMuted};
    }

    pre {
        margin-top: ${p => p.theme.spacing.sm};
        padding: ${p => p.theme.spacing.sm};
        max-height: 180px;
        overflow: auto;
        background: ${p => p.theme.colors.surfaceAlt};
        border-radius: ${p => p.theme.radii.md};
        font-size: ${p => p.theme.fontSizes.xs};
        color: ${p => p.theme.colors.textSecondary};
        white-space: pre-wrap;
        word-break: break-word;
    }
`;

const Spinner = styled.div`
    width: 28px;
    height: 28px;
    margin: 0 auto ${p => p.theme.spacing.md};
    border: 3px solid ${p => p.theme.colors.border};
    border-top-color: ${p => p.theme.colors.primary};
    border-radius: ${p => p.theme.radii.full};
    animation: db-error-spin 700ms linear infinite;

    @keyframes db-error-spin {
        to { transform: rotate(360deg); }
    }
`;

/**
 * Ekran "aktualizuję aplikację" - pokazywany przez ułamek sekundy między
 * wykryciem brakującego chunku a przeładowaniem strony. Bez niego użytkownik
 * zobaczyłby mignięcie ekranu błędu.
 */
export function UpdatingScreen() {
    return (
        <StyledThemeProvider theme={theme}>
            <Screen>
                <Card>
                    <Spinner />
                    <Title>Aktualizuję aplikację…</Title>
                    <Description>
                        Pobieram najnowszą wersję DetailBoost. Potrwa to chwilę.
                    </Description>
                </Card>
            </Screen>
        </StyledThemeProvider>
    );
}

interface ErrorScreenProps {
    /** Techniczne szczegóły do rozwijanej sekcji (widoczne tylko po kliknięciu). */
    details?: string;
    /** Tekst opisu; domyślny mówi o nieoczekiwanym błędzie. */
    description?: string;
    /** Nagłówek; domyślny mówi o nieoczekiwanym błędzie. */
    title?: string;
}

/**
 * Generyczny ekran błędu dla wszystkiego, czego nie da się naprawić
 * przeładowaniem: błędów renderowania, 500 z API, wyczerpanego limitu prób
 * odświeżenia.
 *
 * Własny `ThemeProvider` jest tu celowo: komponent bywa montowany POZA drzewem
 * aplikacji (globalny ErrorBoundary w main.tsx), gdzie kontekstu motywu nie ma,
 * a wtedy każde `p.theme.*` wysypałoby sam ekran błędu.
 */
export function ErrorScreen({ details, description, title }: ErrorScreenProps) {
    return (
        <StyledThemeProvider theme={theme}>
            <Screen>
                <Card>
                    <Icon>⚠️</Icon>
                    <Title>{title ?? 'Wystąpił nieoczekiwany błąd'}</Title>
                    <Description>
                        {description ?? (
                            <>
                                Odśwież stronę i spróbuj ponownie. Jeśli problem się powtarza,
                                skontaktuj się ze wsparciem DetailBoost.
                            </>
                        )}
                    </Description>
                    <ButtonGroup $justify="center">
                        <Button $variant="primary" onClick={() => window.location.reload()}>
                            Odśwież stronę
                        </Button>
                        <Button $variant="secondary" onClick={() => { window.location.href = '/'; }}>
                            Wróć na stronę główną
                        </Button>
                    </ButtonGroup>
                    {details && (
                        <Details>
                            <summary>Szczegóły techniczne</summary>
                            <pre>{details}</pre>
                        </Details>
                    )}
                </Card>
            </Screen>
        </StyledThemeProvider>
    );
}
