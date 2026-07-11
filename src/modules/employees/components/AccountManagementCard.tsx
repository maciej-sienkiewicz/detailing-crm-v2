import { useState } from 'react';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
    useCreateAccount,
    useSetAccountBlocked,
    useDeleteAccount,
    useChangePassword,
    useDeleteEmployee,
} from '@/modules/settings/hooks/useTeam';
import { useRoles } from '@/modules/settings/hooks/useRoles';
import { rolesApi } from '@/modules/settings/api/rolesApi';
import { ChangePasswordModal } from '@/modules/settings/components/team/ChangePasswordModal';
import { EMPLOYEES_KEY } from '../hooks/useEmployees';
import type { EmployeeDetail } from '../types';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// ─── Styled ──────────────────────────────────────────────────────────────────

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const StatusRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
`;

const StatusPill = styled.span<{ $tone: 'active' | 'blocked' | 'none' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    ${({ $tone }) => {
        if ($tone === 'active') return `background: ${st.accentGreenDim}; color: #059669;`;
        if ($tone === 'blocked') return `background: ${st.accentRedDim}; color: #DC2626;`;
        return `background: ${st.bgCardAlt}; color: ${st.textMuted};`;
    }}

    &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
    }
`;

const HintText = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    line-height: 1.5;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const Label = styled.label`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const Input = styled.input<{ $error?: boolean }>`
    padding: 9px 12px;
    border: 1px solid ${({ $error }) => ($error ? st.accentRed : st.border)};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color ${st.transition}, box-shadow ${st.transition};
    &:focus { border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const Select = styled.select`
    padding: 9px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color ${st.transition}, box-shadow ${st.transition};
    &:focus { border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentRed};
`;

const PrimaryBtn = styled.button`
    padding: 9px 14px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    width: 100%;
    transition: background ${st.transition};
    &:hover { background: #2563EB; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const OutlineBtn = styled.button<{ $danger?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: none;
    border: 1px solid ${({ $danger }) => ($danger ? 'rgba(239,68,68,0.35)' : st.border)};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${({ $danger }) => ($danger ? st.accentRed : st.textSecondary)};
    cursor: pointer;
    width: 100%;
    transition: all ${st.transition};

    &:hover {
        ${({ $danger }) => ($danger
            ? `background: ${st.accentRedDim}; border-color: ${st.accentRed};`
            : `border-color: ${st.borderHover}; color: ${st.text};`)}
    }

    &:disabled { opacity: 0.5; cursor: not-allowed; }

    svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

const BtnStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
`;

const CancelLink = styled.button`
    background: none;
    border: none;
    padding: 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    cursor: pointer;
    align-self: center;
    &:hover { color: ${st.text}; }
`;

// ─── Ikony ───────────────────────────────────────────────────────────────────

const KeyIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
    </svg>
);

const LockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const UnlockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
);

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

// ─── Komponent ───────────────────────────────────────────────────────────────

interface Props {
    employee: EmployeeDetail;
    /** Wywoływane po każdej zmianie konta — widok powinien odświeżyć dane pracownika. */
    onChanged: () => void;
    /** Wywoływane po usunięciu pracownika (nawigacja poza profil). */
    onEmployeeDeleted: () => void;
}

export const AccountManagementCard = ({ employee, onChanged, onEmployeeDeleted }: Props) => {
    const { showSuccess } = useToast();
    const queryClient = useQueryClient();
    const { roles } = useRoles();

    const createAccount = useCreateAccount();
    const setBlocked = useSetAccountBlocked();
    const deleteAccount = useDeleteAccount();
    const changePassword = useChangePassword();
    const deleteEmployee = useDeleteEmployee();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [accountEmail, setAccountEmail] = useState(employee.email ?? '');
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [confirm, setConfirm] = useState<null | 'block' | 'unblock' | 'deleteAccount' | 'deleteEmployee'>(null);

    const account = employee.account;
    const tone = account ? (account.isActive ? 'active' : 'blocked') : 'none';

    // Hooki z ustawień unieważniają klucze ['settings','team'] — profil żyje na
    // kluczach modułu employees, więc dokładamy własną inwalidację + refetch.
    const refreshProfile = () => {
        queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
        onChanged();
    };

    const handleCreateAccount = () => {
        if (!accountEmail.trim()) { setEmailError('Adres e-mail jest wymagany'); return; }
        if (!isEmail(accountEmail)) { setEmailError('Nieprawidłowy adres e-mail'); return; }
        createAccount.mutate(
            { employeeId: employee.id, payload: { email: accountEmail.trim() } },
            {
                onSuccess: async ({ userId }) => {
                    if (selectedRoleId) {
                        await rolesApi.assignRole(userId, selectedRoleId).catch(() => {});
                    }
                    showSuccess('Konto utworzone', 'Zaproszenie zostało wysłane na podany adres e-mail.');
                    setShowCreateForm(false);
                    setSelectedRoleId('');
                    refreshProfile();
                },
            },
        );
    };

    const handleAssignRole = (roleId: string) => {
        if (!account) return;
        const value = roleId === '' ? null : roleId;
        rolesApi.assignRole(account.userId, value)
            .then(() => {
                showSuccess(value ? 'Rola przypisana' : 'Rola usunięta');
                refreshProfile();
            })
            .catch(() => { /* globalny handler pokazuje toast błędu */ });
    };

    const handleBlockToggle = (block: boolean) => {
        setBlocked.mutate(
            { employeeId: employee.id, block },
            {
                onSuccess: () => {
                    showSuccess(block ? 'Konto zablokowane' : 'Konto odblokowane');
                    refreshProfile();
                },
            },
        );
    };

    const handleDeleteAccount = () => {
        deleteAccount.mutate(employee.id, {
            onSuccess: () => {
                showSuccess('Konto usunięte', 'Pracownik pozostaje w systemie.');
                refreshProfile();
            },
        });
    };

    const handleDeleteEmployee = () => {
        deleteEmployee.mutate(employee.id, {
            onSuccess: () => {
                showSuccess('Pracownik usunięty');
                queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
                onEmployeeDeleted();
            },
        });
    };

    const handleChangePassword = (payload: { newPassword: string; confirmPassword: string }) => {
        changePassword.mutate(
            { employeeId: employee.id, payload },
            {
                onSuccess: () => {
                    showSuccess('Hasło zmienione');
                    setShowPasswordModal(false);
                },
            },
        );
    };

    return (
        <>
            <Section>
                <SectionTitle>Konto i dostęp</SectionTitle>

                <StatusRow>
                    <StatusPill $tone={tone}>
                        {account ? (account.isActive ? 'Konto aktywne' : 'Konto zablokowane') : 'Brak konta'}
                    </StatusPill>
                </StatusRow>

                {!account && !showCreateForm && (
                    <>
                        <HintText>
                            Pracownik nie może się logować. Utwórz konto, a zaproszenie
                            trafi na jego adres e-mail.
                        </HintText>
                        <OutlineBtn onClick={() => setShowCreateForm(true)}>
                            <KeyIcon /> Utwórz konto i wyślij zaproszenie
                        </OutlineBtn>
                    </>
                )}

                {!account && showCreateForm && (
                    <BtnStack>
                        <Field>
                            <Label>E-mail konta (login) *</Label>
                            <Input
                                placeholder="login@firma.pl"
                                value={accountEmail}
                                onChange={e => { setAccountEmail(e.target.value); setEmailError(null); }}
                                $error={!!emailError}
                                autoFocus
                            />
                            {emailError && <ErrorMsg>{emailError}</ErrorMsg>}
                        </Field>
                        <Field>
                            <Label>Rola (uprawnienia)</Label>
                            <Select value={selectedRoleId} onChange={e => setSelectedRoleId(e.target.value)}>
                                <option value="">Brak roli</option>
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </Select>
                        </Field>
                        <PrimaryBtn onClick={handleCreateAccount} disabled={createAccount.isPending}>
                            {createAccount.isPending ? 'Wysyłanie…' : 'Utwórz i wyślij zaproszenie'}
                        </PrimaryBtn>
                        <CancelLink onClick={() => { setShowCreateForm(false); setEmailError(null); }}>
                            Anuluj
                        </CancelLink>
                    </BtnStack>
                )}

                {account && (
                    <BtnStack>
                        <Field>
                            <Label>Rola (uprawnienia)</Label>
                            <Select
                                value={account.roleId ?? ''}
                                onChange={e => handleAssignRole(e.target.value)}
                            >
                                <option value="">Brak roli</option>
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </Select>
                            <HintText>Zmiana roli natychmiast aktualizuje uprawnienia.</HintText>
                        </Field>

                        {account.isActive ? (
                            <OutlineBtn onClick={() => setConfirm('block')} disabled={setBlocked.isPending}>
                                <LockIcon /> Deaktywuj konto
                            </OutlineBtn>
                        ) : (
                            <OutlineBtn onClick={() => setConfirm('unblock')} disabled={setBlocked.isPending}>
                                <UnlockIcon /> Aktywuj konto
                            </OutlineBtn>
                        )}
                        <OutlineBtn onClick={() => setShowPasswordModal(true)}>
                            <KeyIcon /> Zmień hasło
                        </OutlineBtn>
                        <OutlineBtn $danger onClick={() => setConfirm('deleteAccount')} disabled={deleteAccount.isPending}>
                            <TrashIcon /> Usuń konto
                        </OutlineBtn>
                    </BtnStack>
                )}
            </Section>

            <Section>
                <SectionTitle>Strefa niebezpieczna</SectionTitle>
                <OutlineBtn $danger onClick={() => setConfirm('deleteEmployee')} disabled={deleteEmployee.isPending}>
                    <TrashIcon /> Usuń pracownika
                </OutlineBtn>
            </Section>

            {showPasswordModal && (
                <ChangePasswordModal
                    employeeName={employee.fullName}
                    isSaving={changePassword.isPending}
                    onClose={() => setShowPasswordModal(false)}
                    onSubmit={handleChangePassword}
                />
            )}

            <ConfirmationModal
                isOpen={confirm === 'block'}
                title="Deaktywować konto?"
                message="Zablokowany użytkownik nie będzie mógł się zalogować. Możesz aktywować konto ponownie w dowolnej chwili."
                variant="warning"
                confirmText="Deaktywuj"
                onConfirm={() => { handleBlockToggle(true); setConfirm(null); }}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmationModal
                isOpen={confirm === 'unblock'}
                title="Aktywować konto?"
                message="Użytkownik odzyska możliwość logowania do systemu."
                variant="info"
                confirmText="Aktywuj"
                onConfirm={() => { handleBlockToggle(false); setConfirm(null); }}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmationModal
                isOpen={confirm === 'deleteAccount'}
                title="Usunąć konto?"
                message="Konto użytkownika zostanie trwale usunięte i odłączone od pracownika. Pracownik pozostanie w systemie."
                variant="danger"
                confirmText="Usuń konto"
                onConfirm={() => { handleDeleteAccount(); setConfirm(null); }}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmationModal
                isOpen={confirm === 'deleteEmployee'}
                title="Usunąć pracownika?"
                message="Pracownik zostanie trwale usunięty z systemu razem z historią urlopów. Jeśli posiada konto, zostanie ono automatycznie usunięte."
                variant="danger"
                confirmText="Usuń pracownika"
                onConfirm={() => { handleDeleteEmployee(); setConfirm(null); }}
                onCancel={() => setConfirm(null)}
            />
        </>
    );
};
