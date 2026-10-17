import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { IconButton, Notice } from '@/common/components/ui';
import { invalidateAccounts, useInstagramConnection } from '../../hooks/useAccounts';
import { connectionResult, withoutResultParams, type ConnectionResult } from './accountsLogic';
import { Column, Columns } from './accountsStyles';
import { InstagramAccountCard } from './InstagramAccountCard';
import { DmThreadsPanel } from './DmThreadsPanel';
import { GoogleBusinessPanel } from './GoogleBusinessPanel';
import { PostingPlanPanel } from './PostingPlanPanel';
import { MarketNotificationPreferences } from '@/common/components/notifications';

/**
 * Zakładka „Moje konta" (`?widok=moj`): własny Instagram i wizytówka Google studia.
 *
 * Tu odpowiadamy na pytanie, którego reszta modułu zadać nie umie: czy moje kanały
 * przynoszą klientów - kliknięcia „zadzwoń", trasy, wiadomości, opinie. Dane
 * konkurencji są w innych zakładkach.
 *
 * Kolumna główna: Instagram (jedyna wyniesiona karta) i Google. Boczna: kto czeka
 * na odpowiedź i plan publikacji.
 */

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
`;

const RESULT_TONE: Record<ConnectionResult['tone'], 'ok' | 'info' | 'danger'> = { ok: 'ok', info: 'info', danger: 'danger' };

export const MyAccountsTab = () => {
    const [params, setParams] = useSearchParams();
    const queryClient = useQueryClient();
    // Okno logowania Facebooka i Google wraca pełnym przeładowaniem strony, więc wynik
    // czytamy raz, przy montowaniu - z adresu, który zaraz wyczyścimy.
    const [result, setResult] = useState<ConnectionResult | null>(() => connectionResult(params));
    const connection = useInstagramConnection();
    const igConnected = connection.data?.status === 'CONNECTED';

    /*
     * Powrót z logowania Facebookiem albo Google przynosi wynik w adresie. Pokazujemy
     * zdanie i od razu czyścimy adres: inaczej odświeżenie strony pokazywałoby
     * „Instagram połączony" po raz drugi, a link skopiowany z paska - komuś innemu.
     */
    useEffect(() => {
        if (!connectionResult(params)) return;
        invalidateAccounts(queryClient);
        setParams(prev => withoutResultParams(prev), { replace: true });
    }, [params, setParams, queryClient]);

    return (
        <Wrap>
            {result && (
                <Notice
                    tone={RESULT_TONE[result.tone]}
                    title={result.title}
                    role="status"
                    action={(
                        <IconButton label="Zamknij komunikat" size="sm" variant="ghost" onClick={() => setResult(null)}>
                            <X />
                        </IconButton>
                    )}
                >
                    {result.text}
                </Notice>
            )}

            <Columns>
                <Column>
                    <InstagramAccountCard connection={connection.data} isLoading={connection.isLoading} />
                    <GoogleBusinessPanel canUsePrimary={igConnected} />
                </Column>
                <Column>
                    {igConnected && <DmThreadsPanel />}
                    <PostingPlanPanel />
                    {/* Ustawienie powiadomień stoi też tutaj: właściciel szuka go tam, gdzie widzi rynek reklam. */}
                    <MarketNotificationPreferences />
                </Column>
            </Columns>
        </Wrap>
    );
};
