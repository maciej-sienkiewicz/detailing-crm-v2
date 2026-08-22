// src/modules/comms/components/MailboxSyncPanel.tsx
// Stan „trwa pierwsza synchronizacja skrzynki" — wspólny dla poczty i leadów.
//
// Pierwszy import potrafi trwać minuty i przez ten czas obie listy rosną
// z sekundy na sekundę. Pokazywanie ich w tym stanie uczyło użytkownika, że
// aplikacja jest chaotyczna: wiersze skakały, liczniki się zmieniały, a każda
// wiadomość strzelała powiadomieniem. Jeden spokojny ekran z paskiem postępu
// mówi prawdę — „pracujemy, wróć za parę minut" — i niczego nie udaje.
import styled, { keyframes } from 'styled-components';
import { RefreshCw } from 'lucide-react';
import { useMailboxSyncState } from '../hooks/useComms';

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const Wrap = styled.div`
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 64px 24px;
    text-align: center;

    svg {
        width: 34px;
        height: 34px;
        color: ${p => p.theme.colors.primary};
        animation: ${spin} 1.6s linear infinite;
    }

    h3 {
        margin: 0;
        font-size: 17px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }

    p {
        margin: 0;
        max-width: 420px;
        font-size: 13.5px;
        line-height: 1.55;
        color: ${p => p.theme.colors.textSecondary};
    }
`;

const ProgressTrack = styled.div`
    width: min(360px, 100%);
    height: 8px;
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $fraction: number }>`
    height: 100%;
    width: ${p => Math.round(p.$fraction * 100)}%;
    border-radius: inherit;
    background: ${p => p.theme.colors.primary};
    transition: width 600ms ease;
`;

const ProgressLabel = styled.span`
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${p => p.theme.colors.textMuted};
`;

/**
 * Sama treść stanu — bez własnej karty, żeby każdy widok mógł ją osadzić we
 * własnej powierzchni (AppCard w poczcie, SurfaceCard w leadach).
 */
export function MailboxSyncPanel() {
    const { progress, processed, total } = useMailboxSyncState();

    return (
        <Wrap>
            <RefreshCw />
            <h3>Trwa synchronizacja Twojej skrzynki pocztowej</h3>
            <p>
                Pobieramy Twoją dotychczasową korespondencję i układamy z niej rozmowy.
                Poczekaj kilka minut i wróć ponownie — wszystko zrobi się samo.
            </p>
            {/* Pasek dopiero, gdy backend zgłosił liczbę wiadomości. Zmyślony procent,
                który doskakuje do 100% i stoi, jest gorszy niż sam spinner. */}
            {progress !== null && total > 0 && (
                <>
                    <ProgressTrack aria-hidden>
                        <ProgressFill $fraction={progress} />
                    </ProgressTrack>
                    <ProgressLabel>
                        {processed} z {total} wiadomości ({Math.round(progress * 100)}%)
                    </ProgressLabel>
                </>
            )}
        </Wrap>
    );
}
