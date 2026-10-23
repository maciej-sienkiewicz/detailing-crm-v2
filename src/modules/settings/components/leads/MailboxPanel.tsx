// src/modules/settings/components/leads/MailboxPanel.tsx
//
// „Skrzynka pocztowa" w Ustawienia → Klienci → Zapytania i poczta.
//
// Pokazuje, czy poczta studia jest podłączona i kiedy ostatnio ją pobrano, bo od tego
// zależy wszystko pod spodem: automat czyta tylko to, co przyszło do podłączonej
// skrzynki. Samo podłączanie (adres → wykrycie dostawcy → hasło) zostaje na swoim
// ekranie, /communication/mailboxes - to kilkustopniowy formularz, a nie wiersz
// ustawień. Odłączenie pyta oknem, a nie window.confirm: usuwa zapisane hasło.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Mail } from 'lucide-react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Button, ButtonLink, Notice, Panel, SectionTitle, StatusPill, ui } from '@/common/components/ui';
import { useDisconnectAccount, useMailAccounts, useSyncAccount } from '@/modules/comms/hooks/useComms';
import { formatDateTime } from '@/modules/comms/components/shared';
import type { MailAccountState } from '@/modules/comms/types';

const Box = styled(Panel)`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 22px;

    @media (max-width: 640px) { padding: 16px; }
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    flex-wrap: wrap;
`;

const Account = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 12px;

    & + & { padding-top: 12px; border-top: 1px solid ${ui.lineFaint}; }
`;

const AccountIcon = styled.span`
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: ${ui.brandTint};
    color: ${ui.brandInk};

    svg { width: 17px; height: 17px; }
`;

const AccountText = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;

    strong { font-size: 14.5px; font-weight: 600; color: ${ui.ink}; overflow-wrap: anywhere; }
    span { font-size: 12.5px; line-height: 1.45; color: ${ui.textMuted}; }
    span.err { color: ${ui.dangerInk}; }
`;

const AccountActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding-left: 48px;
`;

const Empty = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.textSecondary};
`;

const syncLine = (account: MailAccountState): string => {
    if (account.initialSyncInProgress) return 'Trwa pierwsze pobieranie poczty.';
    if (!account.lastSyncAt) return 'Za chwilę pobierzemy pocztę.';
    return `Ostatnio pobrano: ${formatDateTime(account.lastSyncAt)}. Odpowiedzi idą z tego adresu.`;
};

export function MailboxPanel() {
    const { data, isLoading, isError, refetch } = useMailAccounts();
    const sync = useSyncAccount();
    const disconnect = useDisconnectAccount();
    const { showSuccess, showError } = useToast();
    const [disconnecting, setDisconnecting] = useState<MailAccountState | null>(null);

    // DISABLED to skrzynka odłączona - ekran podłączania też jej nie pokazuje.
    const accounts = (data ?? []).filter(account => account.status !== 'DISABLED');

    const syncNow = (account: MailAccountState) => sync.mutate(account.id, {
        onSuccess: () => showSuccess('Sprawdzamy pocztę', 'Nowe wiadomości pojawią się za chwilę.'),
        onError: () => showError('Nie udało się sprawdzić poczty', 'Spróbuj ponownie za chwilę.'),
    });

    const confirmDisconnect = () => {
        if (!disconnecting) return;
        const account = disconnecting;
        setDisconnecting(null);
        disconnect.mutate(account.id, {
            onSuccess: () => showSuccess('Skrzynka odłączona', `${account.emailAddress} nie jest już pobierana.`),
            onError: () => showError('Nie udało się odłączyć skrzynki', 'Spróbuj ponownie za chwilę.'),
        });
    };

    return (
        <Box aria-labelledby="mailbox-title">
            <Head>
                <SectionTitle as="h3" id="mailbox-title">Skrzynka pocztowa</SectionTitle>
                {accounts.length > 0 && (
                    <ButtonLink as={Link} to="/communication/mailboxes" $variant="ghost" $size="sm">
                        Podłącz kolejną
                    </ButtonLink>
                )}
            </Head>

            {isError ? (
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać skrzynek"
                    action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                >
                    Sprawdź połączenie z internetem.
                </Notice>
            ) : isLoading ? (
                <Empty role="status">Wczytywanie skrzynek…</Empty>
            ) : accounts.length === 0 ? (
                <>
                    <Empty>
                        Poczta studia nie jest podłączona. Po podłączeniu odpisujesz klientom
                        z CRM, a automat może zakładać zapytania z nowych wiadomości.
                    </Empty>
                    <ButtonLink as={Link} to="/communication/mailboxes" $variant="tinted" $size="md" style={{ alignSelf: 'flex-start' }}>
                        Podłącz skrzynkę
                    </ButtonLink>
                </>
            ) : (
                accounts.map(account => (
                    <Account key={account.id}>
                        <AccountIcon aria-hidden="true"><Mail /></AccountIcon>
                        <AccountText>
                            <strong>{account.emailAddress}</strong>
                            {account.status === 'AUTH_FAILED' ? (
                                <span className="err">
                                    {account.lastError ?? 'Hasło przestało działać. Podłącz skrzynkę ponownie.'}
                                </span>
                            ) : (
                                <span>{syncLine(account)}</span>
                            )}
                        </AccountText>
                        <StatusPill $tone={account.status === 'ACTIVE' ? 'ok' : 'danger'}>
                            {account.status === 'ACTIVE' ? 'Połączona' : 'Wymaga hasła'}
                        </StatusPill>
                    </Account>
                ))
            )}

            {accounts.length > 0 && (
                <AccountActions>
                    {accounts.length === 1 && accounts[0].status === 'ACTIVE' && (
                        <Button variant="tinted" size="sm" onClick={() => syncNow(accounts[0])} disabled={sync.isPending}>
                            Sprawdź pocztę teraz
                        </Button>
                    )}
                    {accounts.some(account => account.status === 'AUTH_FAILED') && (
                        <ButtonLink as={Link} to="/communication/mailboxes" $variant="tinted" $size="sm">
                            Podłącz ponownie
                        </ButtonLink>
                    )}
                    {accounts.length === 1 && (
                        <Button variant="ghost" size="sm" onClick={() => setDisconnecting(accounts[0])} disabled={disconnect.isPending}>
                            Odłącz skrzynkę
                        </Button>
                    )}
                    {accounts.length > 1 && (
                        <ButtonLink as={Link} to="/communication/mailboxes" $variant="ghost" $size="sm">
                            Zarządzaj skrzynkami
                        </ButtonLink>
                    )}
                </AccountActions>
            )}

            <ConfirmationModal
                isOpen={disconnecting !== null}
                title={`Odłączyć skrzynkę ${disconnecting?.emailAddress ?? ''}?`}
                message="CRM przestanie pobierać z niej pocztę, a zapisane hasło zostanie usunięte. Pobrane wiadomości i zapytania zostają."
                variant="danger"
                confirmText="Odłącz skrzynkę"
                cancelText="Zostaw"
                onConfirm={confirmDisconnect}
                onCancel={() => setDisconnecting(null)}
            />
        </Box>
    );
}
