// src/modules/comms/views/MailboxConnectView.tsx
// Podłączanie skrzynki: adres → automatyczna detekcja (MX) → hasło. Użytkownik
// nigdy nie widzi słów IMAP/port, chyba że sam otworzy ustawienia ręczne.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, CheckCircle2, Trash2 } from 'lucide-react';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { useToast } from '@/common/components/Toast';
import {
    useConnectAccount,
    useDetectProvider,
    useDisconnectAccount,
    useMailAccounts,
    useSyncAccount,
} from '../hooks/useComms';
import type { ProviderDetectResult } from '../types';
import { IconButton, PrimaryButton, formatDateTime } from '../components/shared';

const Screen = styled.div`
    max-width: 760px;
    margin: 0 auto;
    padding: ${p => p.theme.spacing.md};
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;

    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: ${p => p.theme.spacing.xl}; }
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
`;

const Card = styled.section`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.xl};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.04);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Helper = styled.p`
    margin: 0;
    font-size: 13px;
    color: #6b7280;
`;

const Field = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: #374151;

    input {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 9px 12px;
        font-size: 14px;
        outline: none;

        &:focus { border-color: #9ca3af; }
    }
`;

const TwoColumns = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 10px;
`;

const ErrorText = styled.div`
    font-size: 13px;
    color: #b91c1c;
    background: #fef2f2;
    border-radius: 8px;
    padding: 10px 12px;
`;

const AccountRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid #f3f4f6;
    font-size: 14px;
    color: #111827;

    &:last-child { border-bottom: none; }

    .meta { flex: 1; }
    .sub { font-size: 12px; color: #6b7280; }
    .err { font-size: 12px; color: #b91c1c; }
`;

const AdvancedToggle = styled.button`
    border: none;
    background: none;
    color: #6b7280;
    font-size: 12px;
    text-decoration: underline;
    cursor: pointer;
    align-self: flex-start;
    padding: 0;
`;

export default function MailboxConnectView() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [detection, setDetection] = useState<ProviderDetectResult | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [manual, setManual] = useState({ imapHost: '', imapPort: '', smtpHost: '', smtpPort: '' });
    const [error, setError] = useState<string | null>(null);

    const { data: accounts } = useMailAccounts();
    const detect = useDetectProvider();
    const connect = useConnectAccount();
    const disconnect = useDisconnectAccount();
    const sync = useSyncAccount();
    const { showSuccess } = useToast();

    const runDetect = () => {
        setError(null);
        if (!email.includes('@')) return;
        detect.mutate(email, {
            onSuccess: setDetection,
            onError: () => setDetection(null),
        });
    };

    const submit = () => {
        setError(null);
        connect.mutate(
            {
                email,
                password,
                imapHost: manual.imapHost || undefined,
                imapPort: manual.imapPort ? Number(manual.imapPort) : undefined,
                smtpHost: manual.smtpHost || undefined,
                smtpPort: manual.smtpPort ? Number(manual.smtpPort) : undefined,
            },
            {
                onSuccess: (account) => {
                    setPassword('');
                    setDetection(null);
                    setEmail('');
                    sync.mutate(account.id);
                    showSuccess(
                        'Skrzynka połączona',
                        'Pobieramy wiadomości z ostatnich 90 dni - możesz już pracować'
                    );
                },
                onError: (err) => {
                    const message = (err as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message;
                    setError(message ?? 'Nie udało się połączyć ze skrzynką. Sprawdź dane i spróbuj ponownie.');
                },
            }
        );
    };

    const oauthProvider = detection && detection.providerType !== 'IMAP_SMTP';

    return (
        <Screen>
            <PageHeader
                title="Skrzynki pocztowe"
                subtitle="Podłącz pocztę firmową - wykrywamy serwer automatycznie"
                actions={
                    <Link to="/communication">
                        <PageHeaderGhostButton as="span">
                            <ArrowLeft /> Wróć do skrzynki
                        </PageHeaderGhostButton>
                    </Link>
                }
            />

            <Card>
                <Helper>
                    Podaj adres i hasło do swojej skrzynki. Serwer pocztowy wykryjemy automatycznie,
                    a wiadomości będą synchronizować się w tle - także statusy przeczytania.
                </Helper>

                <Field>
                    Adres e-mail
                    <input
                        type="email"
                        value={email}
                        placeholder="biuro@twojafirma.pl"
                        onChange={(event) => setEmail(event.target.value)}
                        onBlur={runDetect}
                    />
                </Field>

                {oauthProvider && (
                    <ErrorText style={{ background: '#eff6ff', color: '#1e40af' }}>
                        Ta skrzynka ({detection?.providerType === 'GOOGLE_API' ? 'Gmail' : 'Microsoft 365'})
                        wymaga logowania u dostawcy. Ta metoda będzie dostępna wkrótce - na razie
                        możesz podłączyć skrzynkę z klasycznego hostingu.
                    </ErrorText>
                )}

                {!oauthProvider && (
                    <>
                        <Field>
                            Hasło do skrzynki
                            <input
                                type="password"
                                value={password}
                                autoComplete="new-password"
                                onChange={(event) => setPassword(event.target.value)}
                            />
                        </Field>
                        {detection?.requiresAppPassword && (
                            <Helper>
                                Ten dostawca wymaga „hasła aplikacji" - wygeneruj je w panelu poczty
                                {detection.guideUrl && (
                                    <> (<a href={detection.guideUrl} target="_blank" rel="noreferrer">instrukcja</a>)</>
                                )}{' '}
                                i wklej powyżej zamiast zwykłego hasła.
                            </Helper>
                        )}

                        <AdvancedToggle onClick={() => setShowAdvanced(!showAdvanced)}>
                            {showAdvanced ? 'Ukryj ustawienia ręczne' : 'Ustawienia ręczne (zaawansowane)'}
                        </AdvancedToggle>
                        {showAdvanced && (
                            <>
                                <TwoColumns>
                                    <Field>
                                        Serwer IMAP
                                        <input
                                            value={manual.imapHost}
                                            placeholder={detection?.imapHost ?? 'imap.example.pl'}
                                            onChange={(event) => setManual({ ...manual, imapHost: event.target.value })}
                                        />
                                    </Field>
                                    <Field>
                                        Port
                                        <input
                                            value={manual.imapPort}
                                            placeholder={String(detection?.imapPort ?? 993)}
                                            onChange={(event) => setManual({ ...manual, imapPort: event.target.value })}
                                        />
                                    </Field>
                                </TwoColumns>
                                <TwoColumns>
                                    <Field>
                                        Serwer SMTP
                                        <input
                                            value={manual.smtpHost}
                                            placeholder={detection?.smtpHost ?? 'smtp.example.pl'}
                                            onChange={(event) => setManual({ ...manual, smtpHost: event.target.value })}
                                        />
                                    </Field>
                                    <Field>
                                        Port
                                        <input
                                            value={manual.smtpPort}
                                            placeholder={String(detection?.smtpPort ?? 587)}
                                            onChange={(event) => setManual({ ...manual, smtpPort: event.target.value })}
                                        />
                                    </Field>
                                </TwoColumns>
                            </>
                        )}

                        {error && <ErrorText>{error}</ErrorText>}

                        <PrimaryButton
                            onClick={submit}
                            disabled={!email.includes('@') || password.length === 0 || connect.isPending}
                            style={{ alignSelf: 'flex-start' }}
                        >
                            {connect.isPending ? 'Łączenie…' : 'Połącz skrzynkę'}
                        </PrimaryButton>
                    </>
                )}
            </Card>

            <Card>
                <CardTitle>Podłączone skrzynki</CardTitle>
                {(accounts ?? []).filter((account) => account.status !== 'DISABLED').length === 0 && (
                    <Helper>Nie podłączono jeszcze żadnej skrzynki.</Helper>
                )}
                {(accounts ?? [])
                    .filter((account) => account.status !== 'DISABLED')
                    .map((account) => (
                        <AccountRow key={account.id}>
                            <CheckCircle2
                                size={16}
                                color={account.status === 'ACTIVE' ? '#22c55e' : '#ef4444'}
                            />
                            <div className="meta">
                                {account.emailAddress}
                                <div className="sub">
                                    {account.lastSyncAt
                                        ? `Ostatnia synchronizacja: ${formatDateTime(account.lastSyncAt)}`
                                        : 'Oczekuje na pierwszą synchronizację'}
                                </div>
                                {account.status === 'AUTH_FAILED' && (
                                    <div className="err">
                                        {account.lastError ?? 'Hasło przestało działać - połącz skrzynkę ponownie'}
                                    </div>
                                )}
                            </div>
                            <IconButton
                                onClick={() => {
                                    if (window.confirm(`Odłączyć skrzynkę ${account.emailAddress}? Hasło zostanie usunięte.`)) {
                                        disconnect.mutate(account.id);
                                    }
                                }}
                                aria-label="Odłącz"
                            >
                                <Trash2 size={14} />
                            </IconButton>
                        </AccountRow>
                    ))}
            </Card>
        </Screen>
    );
}
