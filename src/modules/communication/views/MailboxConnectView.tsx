// src/modules/communication/views/MailboxConnectView.tsx
// Podłączanie skrzynki: pole e-mail → detekcja providera → właściwa ścieżka
// (OAuth "Wkrótce" dla GOOGLE_API/MS_GRAPH, formularz hasła dla IMAP_SMTP).
// Poniżej lista podłączonych kont ze statusem.
import { useState } from 'react';
import styled from 'styled-components';
import type { ProviderDetectResult } from '../types';
import {
    useCreateMailAccount,
    useDeleteMailAccount,
    useDetectProvider,
    useMailAccounts,
    useSyncMailAccount,
} from '../hooks';
import { formatDateTime } from '../utils/format';

const Screen = styled.div`
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
`;

const Card = styled.section`
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
`;

const HelperText = styled.p`
    margin: 0;
    font-size: 13px;
    color: #6b7280;
`;

const Field = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: #1a1a1a;
`;

const Input = styled.input`
    height: 36px;
    padding: 0 10px;
    font-size: 14px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: 1px;
    }
`;

const Row = styled.div`
    display: flex;
    gap: 12px;

    > * {
        flex: 1;
    }
`;

const PrimaryButton = styled.button`
    align-self: flex-start;
    height: 36px;
    padding: 0 16px;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    background: ${({ theme }) => theme.colors.primary};
    border: none;
    border-radius: 6px;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const SecondaryButton = styled.button`
    height: 30px;
    padding: 0 12px;
    font-size: 13px;
    color: #1a1a1a;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const WarningBar = styled.div`
    padding: 8px 12px;
    font-size: 13px;
    color: #78350f;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: 13px;
    color: #dc2626;
`;

const AccountRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;

    &:not(:last-child) {
        border-bottom: 1px solid #f3f4f6;
    }
`;

const AccountEmail = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
`;

const AccountMeta = styled.div`
    font-size: 12px;
    color: #6b7280;
`;

const StatusChip = styled.span<{ $status: string }>`
    height: 22px;
    display: inline-flex;
    align-items: center;
    padding: 0 8px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 11px;
    color: ${({ $status }) => ($status === 'ACTIVE' ? '#166534' : $status === 'AUTH_FAILED' ? '#92400e' : '#6b7280')};
    background: ${({ $status }) => ($status === 'ACTIVE' ? '#f0fdf4' : $status === 'AUTH_FAILED' ? '#fffbeb' : '#f3f4f6')};
`;

const AccountActions = styled.div`
    margin-left: auto;
    display: flex;
    gap: 8px;
`;

const GuideLink = styled.a`
    font-size: 13px;
    color: ${({ theme }) => theme.colors.primary};
`;

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Połączona',
    AUTH_FAILED: 'Błąd logowania',
    DISABLED: 'Wyłączona',
};

export const MailboxConnectView = () => {
    const accounts = useMailAccounts();
    const detect = useDetectProvider();
    const create = useCreateMailAccount();
    const remove = useDeleteMailAccount();
    const sync = useSyncMailAccount();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [detected, setDetected] = useState<ProviderDetectResult | null>(null);
    const [imapHost, setImapHost] = useState('');
    const [imapPort, setImapPort] = useState('');
    const [smtpHost, setSmtpHost] = useState('');
    const [smtpPort, setSmtpPort] = useState('');

    const failedAccount = accounts.data?.find((a) => a.status === 'AUTH_FAILED');

    const runDetect = () => {
        const trimmed = email.trim();
        if (!trimmed.includes('@')) return;
        detect.mutate(trimmed, {
            onSuccess: (result) => {
                setDetected(result);
                setImapHost(result.imapHost ?? '');
                setImapPort(result.imapPort ? String(result.imapPort) : '');
                setSmtpHost(result.smtpHost ?? '');
                setSmtpPort(result.smtpPort ? String(result.smtpPort) : '');
            },
        });
    };

    const connect = () => {
        create.mutate({
            email: email.trim(),
            password,
            imapHost: imapHost || null,
            imapPort: imapPort ? Number(imapPort) : null,
            smtpHost: smtpHost || null,
            smtpPort: smtpPort ? Number(smtpPort) : null,
        }, {
            onSuccess: () => {
                setEmail('');
                setPassword('');
                setDetected(null);
            },
        });
    };

    const isOauth = detected && (detected.providerType === 'GOOGLE_API' || detected.providerType === 'MS_GRAPH');

    return (
        <Screen>
            <Title>Skrzynki pocztowe</Title>

            {failedAccount && (
                <WarningBar>
                    Utraciliśmy połączenie ze skrzynką {failedAccount.emailAddress} — wprowadź dane ponownie poniżej.
                </WarningBar>
            )}

            <Card>
                <CardTitle>Podłącz skrzynkę</CardTitle>
                <HelperText>
                    Podaj adres e-mail — resztę ustawień dobierzemy automatycznie.
                </HelperText>
                <Field>
                    Adres e-mail
                    <Input
                        type="email"
                        placeholder="kontakt@twojafirma.pl"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setDetected(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') runDetect();
                        }}
                    />
                </Field>
                {!detected && (
                    <PrimaryButton
                        disabled={!email.trim().includes('@') || detect.isPending}
                        onClick={runDetect}
                    >
                        {detect.isPending ? 'Sprawdzanie…' : 'Dalej'}
                    </PrimaryButton>
                )}
                {detect.isError && (
                    <ErrorText>
                        Nie udało się rozpoznać ustawień tej skrzynki. Sprawdź adres i spróbuj ponownie.
                    </ErrorText>
                )}

                {isOauth && detected && (
                    <>
                        <HelperText>
                            {detected.providerType === 'GOOGLE_API'
                                ? 'Ta skrzynka działa w Google. Logowanie przez Google będzie dostępne wkrótce.'
                                : 'Ta skrzynka działa w Microsoft 365. Logowanie przez Microsoft będzie dostępne wkrótce.'}
                        </HelperText>
                        <PrimaryButton disabled title="Wkrótce">
                            {detected.providerType === 'GOOGLE_API' ? 'Połącz z Google — wkrótce' : 'Połącz z Microsoft — wkrótce'}
                        </PrimaryButton>
                    </>
                )}

                {detected && detected.providerType === 'IMAP_SMTP' && (
                    <>
                        {detected.requiresAppPassword && (
                            <WarningBar>
                                Ta skrzynka wymaga tzw. hasła aplikacji (nie zwykłego hasła).{' '}
                                {detected.guideUrl && (
                                    <GuideLink href={detected.guideUrl} target="_blank" rel="noreferrer">
                                        Zobacz, jak je wygenerować
                                    </GuideLink>
                                )}
                            </WarningBar>
                        )}
                        <Field>
                            Hasło do skrzynki
                            <Input
                                type="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </Field>
                        <Row>
                            <Field>
                                Serwer IMAP
                                <Input value={imapHost} onChange={(e) => setImapHost(e.target.value)} />
                            </Field>
                            <Field>
                                Port IMAP
                                <Input inputMode="numeric" value={imapPort} onChange={(e) => setImapPort(e.target.value)} />
                            </Field>
                        </Row>
                        <Row>
                            <Field>
                                Serwer SMTP
                                <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
                            </Field>
                            <Field>
                                Port SMTP
                                <Input inputMode="numeric" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
                            </Field>
                        </Row>
                        {create.isError && (
                            <ErrorText>
                                Serwer poczty odrzucił logowanie — sprawdź adres i hasło, a następnie spróbuj ponownie.
                            </ErrorText>
                        )}
                        <PrimaryButton disabled={!password || create.isPending} onClick={connect}>
                            {create.isPending ? 'Łączenie…' : 'Połącz'}
                        </PrimaryButton>
                    </>
                )}
            </Card>

            <Card>
                <CardTitle>Podłączone konta</CardTitle>
                {accounts.isLoading && <HelperText>Wczytywanie…</HelperText>}
                {!accounts.isLoading && (accounts.data?.length ?? 0) === 0 && (
                    <HelperText>Brak podłączonych skrzynek.</HelperText>
                )}
                {accounts.data?.map((account) => (
                    <AccountRow key={account.id}>
                        <div>
                            <AccountEmail>{account.emailAddress}</AccountEmail>
                            <AccountMeta>
                                {account.providerType}
                                {account.lastSyncAt && ` · ostatnia synchronizacja ${formatDateTime(account.lastSyncAt)}`}
                            </AccountMeta>
                        </div>
                        <StatusChip $status={account.status}>
                            {STATUS_LABELS[account.status] ?? account.status}
                        </StatusChip>
                        <AccountActions>
                            <SecondaryButton
                                disabled={sync.isPending}
                                onClick={() => sync.mutate(account.id)}
                            >
                                Synchronizuj
                            </SecondaryButton>
                            <SecondaryButton
                                disabled={remove.isPending}
                                onClick={() => {
                                    if (window.confirm(`Odłączyć skrzynkę ${account.emailAddress}? Tej operacji nie można cofnąć.`)) {
                                        remove.mutate(account.id);
                                    }
                                }}
                            >
                                Usuń
                            </SecondaryButton>
                        </AccountActions>
                    </AccountRow>
                ))}
            </Card>
        </Screen>
    );
};

export default MailboxConnectView;
