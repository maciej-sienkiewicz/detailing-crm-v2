// src/modules/employees/components/employee-modal/AccountSettingsPanel.tsx
//
// Zakładka „Ustawienia" w oknie pracownika: konto w aplikacji (reset hasła, zaproszenie,
// utworzenie konta) oraz blokada i usuwanie.
//
// „Resetuj hasło" wysyła pracownikowi link do ustawienia nowego hasła - administrator
// już go nie wpisuje. Hasło znane drugiej osobie trzeba było potem przekazać i nikt
// go już nie zmieniał. Dotychczasowe hasło działa, dopóki pracownik nie ustawi nowego.
//
// W każdym stanie konta jest jedna akcja główna. Wypełniona tylko wtedy, gdy jest
// krokiem następnym: „Utwórz konto" bez konta i potwierdzenie otwartego właśnie
// formularza (CLAUDE.md §2 - otwarty edytor przejmuje okno).

import { useState } from 'react';
import styled from 'styled-components';
import { KeyRound, Lock, Plus, Trash2, Unlock, UserX } from 'lucide-react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Button, SectionTitle, StatusPill, ui, type PillTone } from '@/common/components/ui';
import { formatDateTime } from '@/common/utils';
import { usePermissions } from '@/core/permissions';
import { useRoles } from '@/modules/settings/hooks/useRoles';
import { rolesApi } from '@/modules/settings/api/rolesApi';
import {
    useCreateAccount, useDeleteAccount, useDeleteEmployee, useInvalidateEmployees,
    useResendInvitation, useSendPasswordReset, useSetAccountBlocked,
} from '../../hooks/useEmployees';
import { accountStatusOf, invitationSummary, type AccountStatus } from '../../utils/accountStatus';
import { dateTimeLong } from '../../utils/presence';
import type { EmployeeDetail } from '../../types';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Te same plakietki co w kolumnie „Konto" listy zespołu. */
const ACCOUNT_PILL: Record<AccountStatus, { tone: PillTone; label: string }> = {
    active: { tone: 'ok', label: 'Aktywne' },
    pending: { tone: 'warn', label: 'Nie aktywował konta' },
    blocked: { tone: 'danger', label: 'Zablokowane' },
    none: { tone: 'neutral', label: 'Bez konta' },
};

type Confirm = 'block' | 'unblock' | 'deleteAccount' | 'deleteEmployee';

interface Props {
    employee: EmployeeDetail;
    /** Pracownik usunięty - okno nie ma już czego pokazywać. */
    onEmployeeDeleted: () => void;
}

export function AccountSettingsPanel({ employee, onEmployeeDeleted }: Props) {
    const { showSuccess } = useToast();
    const { isOwner } = usePermissions();
    const { roles } = useRoles();
    const sendReset = useSendPasswordReset();
    const resendInvitation = useResendInvitation();
    const createAccount = useCreateAccount();
    const setBlocked = useSetAccountBlocked();
    const deleteAccount = useDeleteAccount();
    const deleteEmployee = useDeleteEmployee();
    const invalidate = useInvalidateEmployees();

    const [inline, setInline] = useState<'reset' | 'create' | null>(null);
    const [resetSentAt, setResetSentAt] = useState<string | null>(null);
    const [email, setEmail] = useState(employee.email ?? '');
    const [roleId, setRoleId] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<Confirm | null>(null);

    const account = employee.account;
    const status = accountStatusOf(account);
    const first = employee.firstName;
    const pill = ACCOUNT_PILL[status];

    const handleReset = () => sendReset.mutate(employee.id, {
        onSuccess: r => {
            setInline(null);
            setResetSentAt(r.sentAt);
            showSuccess('Link wysłany', `${first} dostanie e-mail na ${r.email}. Link działa do ${formatDateTime(r.expiresAt)}.`);
        },
    });

    const handleResend = () => resendInvitation.mutate(employee.id, {
        onSuccess: ({ expiresAt }) => showSuccess('Zaproszenie wysłane ponownie', `Nowy link działa do ${formatDateTime(expiresAt)}.`),
    });

    const handleCreate = () => {
        if (!email.trim()) { setEmailError('Wpisz e-mail - na ten adres pójdzie zaproszenie.'); return; }
        if (!isEmail(email)) { setEmailError('To nie wygląda na adres e-mail.'); return; }
        createAccount.mutate(
            { employeeId: employee.id, payload: { email: email.trim() } },
            {
                onSuccess: async ({ userId }) => {
                    if (roleId) {
                        await rolesApi.assignRole(userId, roleId).catch(() => {});
                        invalidate(employee.id);
                    }
                    setInline(null);
                    showSuccess('Konto utworzone', `Zaproszenie poszło na ${email.trim()}.`);
                },
            },
        );
    };

    const runConfirm = () => {
        const kind = confirm;
        setConfirm(null);
        if (kind === 'block' || kind === 'unblock') {
            setBlocked.mutate({ employeeId: employee.id, block: kind === 'block' }, {
                onSuccess: () => showSuccess(
                    kind === 'block' ? 'Konto zablokowane' : 'Konto odblokowane',
                    kind === 'block' ? `${first} nie zaloguje się do aplikacji.` : `${first} znowu może się logować.`,
                ),
            });
        } else if (kind === 'deleteAccount') {
            deleteAccount.mutate(employee.id, {
                onSuccess: () => showSuccess('Konto usunięte', `${employee.fullName} zostaje w zespole.`),
            });
        } else if (kind === 'deleteEmployee') {
            deleteEmployee.mutate(employee.id, {
                onSuccess: () => { showSuccess('Pracownik usunięty'); onEmployeeDeleted(); },
            });
        }
    };

    const lastLogin = account?.lastLoginAt ? dateTimeLong(account.lastLoginAt) : null;

    return (
        <Stack>
            <Section>
                <SectionHead>
                    <SectionTitle as="h3">Konto w aplikacji</SectionTitle>
                    <StatusPill $tone={pill.tone}>{pill.label}</StatusPill>
                </SectionHead>
                <Box>
                    {status === 'active' && account && (
                        <>
                            <Facts>
                                <dt>Login</dt><dd>{account.email ?? employee.email}</dd>
                                <dt>Ostatnie logowanie</dt><dd>{lastLogin ?? <Muted>brak danych</Muted>}</dd>
                                <dt>Kod PIN</dt><dd>{account.hasPinConfigured ? 'Ustawiony' : <Muted>Nie ustawiony</Muted>}</dd>
                                {resetSentAt && <><dt>Zmiana hasła</dt><dd>Link wysłany {formatDateTime(resetSentAt)}</dd></>}
                            </Facts>
                            {inline === 'reset' ? (
                                <Inline>
                                    <Lead>
                                        {first} dostanie e-mail z linkiem do ustawienia nowego hasła na {account.email ?? employee.email}.
                                        Dotychczasowe hasło działa, dopóki nie ustawi nowego.
                                    </Lead>
                                    <Actions>
                                        <Button variant="outline" onClick={() => setInline(null)}>Anuluj</Button>
                                        <Button variant="primary" onClick={handleReset} disabled={sendReset.isPending}>
                                            {sendReset.isPending ? 'Wysyłam…' : 'Wyślij link'}
                                        </Button>
                                    </Actions>
                                </Inline>
                            ) : (
                                <Actions>
                                    <Button variant="outline" onClick={() => setInline('reset')}>
                                        <KeyRound aria-hidden="true" /> Resetuj hasło
                                    </Button>
                                </Actions>
                            )}
                        </>
                    )}

                    {status === 'pending' && account && (
                        <>
                            <Lead>{first} jeszcze nie aktywował konta. {invitationSummary(account)}</Lead>
                            <Actions>
                                <Button variant="outline" onClick={handleResend} disabled={resendInvitation.isPending}>
                                    {resendInvitation.isPending ? 'Wysyłam…' : 'Wyślij zaproszenie ponownie'}
                                </Button>
                            </Actions>
                        </>
                    )}

                    {status === 'blocked' && (
                        <>
                            <Lead>{first} nie może się zalogować. Urlopy, karty czasu pracy i historia zostają.</Lead>
                            {lastLogin && <Facts><dt>Ostatnie logowanie</dt><dd>{lastLogin}</dd></Facts>}
                            <Actions>
                                <Button variant="outline" onClick={() => setConfirm('unblock')} disabled={setBlocked.isPending}>
                                    <Unlock aria-hidden="true" /> Odblokuj konto
                                </Button>
                            </Actions>
                        </>
                    )}

                    {status === 'none' && (inline === 'create' ? (
                        <Inline $flush>
                            <Lead>Na ten adres pójdzie zaproszenie. {first} ustawi hasło i zobaczy to, na co pozwala rola.</Lead>
                            <Fields>
                                <Field>
                                    <label htmlFor="employee-account-email">E-mail (login)</label>
                                    <input
                                        id="employee-account-email"
                                        type="email"
                                        value={email}
                                        placeholder="login@firma.pl"
                                        aria-invalid={!!emailError}
                                        onChange={e => { setEmail(e.target.value); setEmailError(null); }}
                                        autoFocus
                                    />
                                    {emailError && <FieldError role="alert">{emailError}</FieldError>}
                                </Field>
                                <Field>
                                    <label htmlFor="employee-account-role">Rola</label>
                                    <select id="employee-account-role" value={roleId} onChange={e => setRoleId(e.target.value)}>
                                        <option value="">Brak roli</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </Field>
                            </Fields>
                            <Actions>
                                <Button variant="outline" onClick={() => { setInline(null); setEmailError(null); }}>Anuluj</Button>
                                <Button variant="primary" onClick={handleCreate} disabled={createAccount.isPending}>
                                    {createAccount.isPending ? 'Wysyłam…' : 'Utwórz konto i wyślij zaproszenie'}
                                </Button>
                            </Actions>
                        </Inline>
                    ) : (
                        <>
                            <Lead>
                                {first} nie ma konta, więc nie loguje się do aplikacji: nie składa wniosków urlopowych
                                ani kart czasu pracy.
                            </Lead>
                            <Actions>
                                <Button variant="primary" onClick={() => setInline('create')}>
                                    <Plus aria-hidden="true" /> Utwórz konto
                                </Button>
                            </Actions>
                        </>
                    ))}
                </Box>
            </Section>

            <Section>
                <SectionTitle as="h3">Blokada i usuwanie</SectionTitle>
                <Rows>
                    {account && account.isActive && (
                        <DangerRow>
                            <span>
                                <strong>Zablokuj konto</strong>
                                <small>{first} nie zaloguje się do aplikacji. Dane zostają, odblokujesz je w każdej chwili.</small>
                            </span>
                            <Button variant="outline" onClick={() => setConfirm('block')} disabled={setBlocked.isPending}>
                                <Lock aria-hidden="true" /> Zablokuj konto
                            </Button>
                        </DangerRow>
                    )}
                    {/* Usuwanie konta i pracownika backend dopuszcza tylko właścicielowi. */}
                    {account && isOwner && (
                        <DangerRow>
                            <span>
                                <strong>Usuń konto</strong>
                                <small>{first} straci logowanie, ale zostaje w zespole razem z urlopami i kartami czasu pracy.</small>
                            </span>
                            <Button variant="tintedDanger" onClick={() => setConfirm('deleteAccount')} disabled={deleteAccount.isPending}>
                                <UserX aria-hidden="true" /> Usuń konto
                            </Button>
                        </DangerRow>
                    )}
                    {isOwner && (
                        <DangerRow>
                            <span>
                                <strong>Usuń pracownika</strong>
                                <small>Znika z zespołu razem z kontem i historią urlopów. Tego nie da się cofnąć.</small>
                            </span>
                            <Button variant="tintedDanger" onClick={() => setConfirm('deleteEmployee')} disabled={deleteEmployee.isPending}>
                                <Trash2 aria-hidden="true" /> Usuń pracownika
                            </Button>
                        </DangerRow>
                    )}
                    {!isOwner && (
                        <Muted as="p">Usunąć konto albo pracownika może tylko właściciel.</Muted>
                    )}
                </Rows>
            </Section>

            <ConfirmationModal
                isOpen={confirm === 'block'}
                title="Zablokować konto?"
                message={`${first} nie zaloguje się do aplikacji. Urlopy, karty i historia zostają. Odblokujesz je w każdej chwili.`}
                variant="warning"
                confirmText="Zablokuj konto"
                onConfirm={runConfirm}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmationModal
                isOpen={confirm === 'unblock'}
                title="Odblokować konto?"
                message={`${first} znowu będzie mógł się logować.`}
                variant="info"
                confirmText="Odblokuj konto"
                onConfirm={runConfirm}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmationModal
                isOpen={confirm === 'deleteAccount'}
                title="Usunąć konto?"
                message={`${first} straci logowanie. Pracownik zostaje w zespole, a urlopy i karty zostają w historii.`}
                variant="danger"
                confirmText="Usuń konto"
                onConfirm={runConfirm}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmationModal
                isOpen={confirm === 'deleteEmployee'}
                title={`Usunąć: ${employee.fullName}?`}
                message="Pracownik zniknie z zespołu razem z kontem i historią urlopów. Tego nie da się cofnąć."
                variant="danger"
                confirmText="Usuń pracownika"
                onConfirm={runConfirm}
                onCancel={() => setConfirm(null)}
            />
        </Stack>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 28px;
`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SectionHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

const Box = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px;
    border: 1px solid ${ui.line};
    border-radius: 16px;
    background: ${ui.surfaceSoft};
`;

const Facts = styled.dl`
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 8px 18px;
    margin: 0;
    font-size: 14px;

    dt { color: ${ui.textMuted}; }
    dd { margin: 0; color: ${ui.ink}; overflow-wrap: anywhere; }

    @media (max-width: 560px) {
        grid-template-columns: minmax(0, 1fr);
        gap: 2px;
        dd { margin-bottom: 8px; }
    }
`;

const Lead = styled.p`
    margin: 0;
    max-width: 62ch;
    font-size: 14px;
    line-height: 1.55;
    color: ${ui.inkSoft};
`;

const Muted = styled.span`
    margin: 0;
    font-size: 14px;
    color: ${ui.textMuted};
`;

const Actions = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
`;

const Inline = styled.div<{ $flush?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 12px;
    ${p => p.$flush ? '' : `padding-top: 14px; border-top: 1px solid ${ui.line};`}
`;

const Fields = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;

    label { font-size: 13px; font-weight: 600; color: ${ui.inkSoft}; }
    input, select {
        width: 100%;
        box-sizing: border-box;
        padding: 9px 12px;
        border: 1.5px solid ${ui.line};
        border-radius: 10px;
        background: ${ui.surface};
        font: inherit;
        font-size: 14px;
        color: ${ui.ink};
    }
    input:focus, select:focus { outline: none; border-color: ${ui.brand}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14); }
    input[aria-invalid='true'] { border-color: ${ui.dangerInk}; }
`;

const FieldError = styled.span`
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.dangerInk};
`;

const Rows = styled.div`
    display: flex;
    flex-direction: column;
`;

const DangerRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px 20px;
    padding: 14px 0;

    & + & { border-top: 1px solid ${ui.lineSoft}; }

    > span { display: flex; flex-direction: column; gap: 3px; flex: 1 1 260px; min-width: 0; }
    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    small { font-size: 13px; line-height: 1.45; color: ${ui.textMuted}; }
`;
