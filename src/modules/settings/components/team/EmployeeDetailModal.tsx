import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, Badge, Dot, FormGrid, FormField, FieldLabel,
    FieldInput, FieldSelect, ErrorMsg, HintText, CancelBtn, SubmitBtn,
    SecondaryBtn, SkeletonBox,
} from '../rbacShared.styles';
import {
    useEmployeeDetail, useCreateAccount, useSetAccountBlocked, useDeleteAccount,
    useChangePassword, useDeleteEmployee,
} from '../../hooks/useTeam';
import { useRoles } from '../../hooks/useRoles';
import { rolesApi } from '../../api/rolesApi';
import { ChangePasswordModal } from './ChangePasswordModal';
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export interface EmployeeDetailModalProps {
    employeeId: string;
    onClose: () => void;
    onEdit: () => void;
    onDeleted: () => void;
}

export function EmployeeDetailModal({ employeeId, onClose, onEdit, onDeleted }: EmployeeDetailModalProps) {
    const navigate = useNavigate();
    const { showSuccess } = useToast();
    const { employee, isLoading } = useEmployeeDetail(employeeId);
    const { roles } = useRoles();

    const createAccount = useCreateAccount();
    const setBlocked = useSetAccountBlocked();
    const deleteAccount = useDeleteAccount();
    const changePassword = useChangePassword();
    const deleteEmployee = useDeleteEmployee();

    const [showCreateAccount, setShowCreateAccount] = useState(false);
    const [accountEmail, setAccountEmail] = useState('');
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [accountEmailError, setAccountEmailError] = useState<string | null>(null);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [confirm, setConfirm] = useState<null | 'block' | 'unblock' | 'deleteAccount' | 'deleteEmployee'>(null);

    const account = employee?.account ?? null;

    const handleCreateAccount = () => {
        if (!accountEmail.trim()) { setAccountEmailError('Adres e-mail jest wymagany'); return; }
        if (!isEmail(accountEmail)) { setAccountEmailError('Nieprawidłowy adres e-mail'); return; }
        createAccount.mutate(
            { employeeId, payload: { email: accountEmail.trim() } },
            {
                onSuccess: async ({ userId }) => {
                    if (selectedRoleId) {
                        await rolesApi.assignRole(userId, selectedRoleId).catch(() => {});
                    }
                    showSuccess('Konto utworzone', 'Zaproszenie zostało wysłane na podany adres e-mail.');
                    setShowCreateAccount(false);
                    setAccountEmail('');
                    setSelectedRoleId('');
                },
            },
        );
    };

    const handleBlockToggle = (block: boolean) => {
        setBlocked.mutate(
            { employeeId, block },
            {
                onSuccess: () => showSuccess(block ? 'Konto zablokowane' : 'Konto odblokowane'),
            },
        );
    };

    const handleDeleteAccount = () => {
        deleteAccount.mutate(employeeId, {
            onSuccess: () => showSuccess('Konto usunięte', 'Pracownik pozostaje w systemie.'),
        });
    };

    const handleDeleteEmployee = () => {
        deleteEmployee.mutate(employeeId, {
            onSuccess: () => {
                showSuccess('Pracownik usunięty');
                onDeleted();
            },
        });
    };

    const handleChangePassword = (payload: { newPassword: string; confirmPassword: string }) => {
        changePassword.mutate(
            { employeeId, payload },
            {
                onSuccess: () => {
                    showSuccess('Hasło zmienione');
                    setShowPasswordModal(false);
                },
            },
        );
    };

    const handleAssignRole = (userId: string, roleId: string) => {
        const value = roleId === '' ? null : roleId;
        rolesApi.assignRole(userId, value)
            .then(() => showSuccess(value ? 'Rola przypisana' : 'Rola usunięta'))
            .catch(() => { /* global handler shows the error toast */ });
    };

    return (
        <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
            <ModalCard $maxWidth={580}>
                <ModalHead>
                    <div>
                        <ModalTitle>{employee?.fullName ?? 'Pracownik'}</ModalTitle>
                        {employee?.email && <ModalSubtitle>{employee.email}</ModalSubtitle>}
                    </div>
                    <ModalCloseBtn onClick={onClose} aria-label="Zamknij">
                        <CloseIcon />
                    </ModalCloseBtn>
                </ModalHead>

                <ModalBody>
                    {isLoading || !employee ? (
                        <>
                            <SkeletonBox $w="60%" />
                            <SkeletonBox $w="80%" />
                            <SkeletonBox $w="40%" />
                        </>
                    ) : (
                        <>
                            {/* Contact info */}
                            <InfoGrid>
                                <Info label="E-mail" value={employee.email} />
                                <Info label="Telefon" value={employee.phone} />
                            </InfoGrid>

                            {/* Account management */}
                            <SectionTitle>Konto użytkownika</SectionTitle>

                            {!account && !showCreateAccount && (
                                <AccountPanel>
                                    <Badge $variant="gray">Brak konta</Badge>
                                    <HintText>
                                        Pracownik nie ma konta do logowania. Możesz je utworzyć i wysłać zaproszenie.
                                    </HintText>
                                    <SecondaryBtn onClick={() => setShowCreateAccount(true)}>
                                        <KeyIcon /> Utwórz konto i wyślij zaproszenie
                                    </SecondaryBtn>
                                </AccountPanel>
                            )}

                            {!account && showCreateAccount && (
                                <AccountPanel>
                                    <FormGrid>
                                        <FormField>
                                            <FieldLabel>E-mail konta (login)<span>*</span></FieldLabel>
                                            <FieldInput
                                                placeholder="login@firma.pl"
                                                value={accountEmail}
                                                onChange={e => { setAccountEmail(e.target.value); setAccountEmailError(null); }}
                                                $error={!!accountEmailError}
                                                autoFocus
                                            />
                                            {accountEmailError && <ErrorMsg>{accountEmailError}</ErrorMsg>}
                                        </FormField>
                                        <FormField>
                                            <FieldLabel>Rola (uprawnienia)</FieldLabel>
                                            <FieldSelect
                                                value={selectedRoleId}
                                                onChange={e => setSelectedRoleId(e.target.value)}
                                            >
                                                <option value="">Brak roli</option>
                                                {roles.map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </FieldSelect>
                                            <HintText>Możesz przypisać rolę później.</HintText>
                                        </FormField>
                                    </FormGrid>
                                    <PanelActions>
                                        <CancelBtn onClick={() => { setShowCreateAccount(false); setAccountEmailError(null); }}>
                                            Anuluj
                                        </CancelBtn>
                                        <SubmitBtn onClick={handleCreateAccount} disabled={createAccount.isPending}>
                                            {createAccount.isPending ? 'Wysyłanie…' : 'Utwórz i wyślij zaproszenie'}
                                        </SubmitBtn>
                                    </PanelActions>
                                </AccountPanel>
                            )}

                            {account && (
                                <AccountPanel>
                                    <AccountHeader>
                                        <div>
                                            <AccountEmail>{employee.email ?? account.userId}</AccountEmail>
                                        </div>
                                        {account.isActive
                                            ? <Badge $variant="green"><Dot $color="#10b981" />Aktywne</Badge>
                                            : <Badge $variant="red"><Dot $color="#ef4444" />Zablokowane</Badge>}
                                    </AccountHeader>

                                    <FormField>
                                        <FieldLabel>Rola (uprawnienia)</FieldLabel>
                                        <FieldSelect
                                            value={account.roleId ?? ''}
                                            onChange={e => handleAssignRole(account.userId, e.target.value)}
                                        >
                                            <option value="">Brak roli</option>
                                            {roles.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </FieldSelect>
                                        <HintText>
                                            Wybór roli natychmiast aktualizuje uprawnienia użytkownika.
                                        </HintText>
                                    </FormField>

                                    <PanelActions>
                                        {account.isActive ? (
                                            <SecondaryBtn onClick={() => setConfirm('block')} disabled={setBlocked.isPending}>
                                                <LockIcon /> Zablokuj konto
                                            </SecondaryBtn>
                                        ) : (
                                            <SecondaryBtn onClick={() => setConfirm('unblock')} disabled={setBlocked.isPending}>
                                                <UnlockIcon /> Odblokuj konto
                                            </SecondaryBtn>
                                        )}
                                        <SecondaryBtn onClick={() => setShowPasswordModal(true)}>
                                            <KeyIcon /> Zmień hasło
                                        </SecondaryBtn>
                                        <SecondaryBtn $variant="danger" onClick={() => setConfirm('deleteAccount')} disabled={deleteAccount.isPending}>
                                            <TrashIcon /> Usuń konto
                                        </SecondaryBtn>
                                    </PanelActions>
                                </AccountPanel>
                            )}
                        </>
                    )}
                </ModalBody>

                <ModalFooter>
                    <SecondaryBtn onClick={() => navigate(`/team/${employeeId}`)} disabled={!employee}>
                        <ProfileIcon /> Pełny profil i urlopy
                    </SecondaryBtn>
                    <SecondaryBtn $variant="danger" onClick={() => setConfirm('deleteEmployee')} disabled={!employee || deleteEmployee.isPending}>
                        <TrashIcon /> Usuń pracownika
                    </SecondaryBtn>
                    <div style={{ flex: 1 }} />
                    <CancelBtn onClick={onClose}>Zamknij</CancelBtn>
                    <SubmitBtn onClick={onEdit} disabled={!employee}>Edytuj dane</SubmitBtn>
                </ModalFooter>
            </ModalCard>

            {showPasswordModal && employee && (
                <ChangePasswordModal
                    employeeName={employee.fullName}
                    isSaving={changePassword.isPending}
                    onClose={() => setShowPasswordModal(false)}
                    onSubmit={handleChangePassword}
                />
            )}

            <ConfirmationModal
                isOpen={confirm === 'block'}
                title="Zablokować konto?"
                message="Zablokowany użytkownik nie będzie mógł się zalogować. Możesz odblokować konto w dowolnej chwili."
                variant="warning"
                confirmText="Zablokuj"
                onConfirm={() => handleBlockToggle(true)}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmationModal
                isOpen={confirm === 'unblock'}
                title="Odblokować konto?"
                message="Użytkownik odzyska możliwość logowania do systemu."
                variant="info"
                confirmText="Odblokuj"
                onConfirm={() => handleBlockToggle(false)}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmationModal
                isOpen={confirm === 'deleteAccount'}
                title="Usunąć konto?"
                message="Konto użytkownika zostanie trwale usunięte i odłączone od pracownika. Pracownik pozostanie w systemie."
                variant="danger"
                confirmText="Usuń konto"
                onConfirm={handleDeleteAccount}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmationModal
                isOpen={confirm === 'deleteEmployee'}
                title="Usunąć pracownika?"
                message="Pracownik zostanie trwale usunięty z systemu. Jeśli posiada konto, zostanie ono automatycznie usunięte."
                variant="danger"
                confirmText="Usuń pracownika"
                onConfirm={handleDeleteEmployee}
                onCancel={() => setConfirm(null)}
            />
        </Overlay>
    );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────
function Info({ label, value }: { label: string; value: string | null }) {
    return (
        <InfoCell>
            <InfoLabel>{label}</InfoLabel>
            <InfoValue $muted={!value}>{value || '—'}</InfoValue>
        </InfoCell>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────
const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 18px;
`;

const InfoCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const InfoLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
`;

const InfoValue = styled.span<{ $muted?: boolean }>`
    font-size: 13px;
    color: ${p => (p.$muted ? '#cbd5e1' : '#0f172a')};
    word-break: break-word;
`;

const SectionTitle = styled.h4`
    margin: 8px 0 0;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;
`;

const AccountPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
    padding: 16px;
    background: #fafbfc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
`;

const AccountHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 12px;
`;

const AccountEmail = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
`;

const AccountMeta = styled.div`
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
`;

const PanelActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
`;

// ─── Icons ───────────────────────────────────────────────────────────────────────
const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const KeyIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
    </svg>
);
const LockIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);
const UnlockIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
);
const ProfileIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
);
const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);
