import { useState } from 'react';
import styled from 'styled-components';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, FormField, FieldLabel, FieldInput, ErrorMsg,
    CancelBtn, SubmitBtn,
} from '../rbacShared.styles';
import type { ChangePasswordRequest } from '../../teamTypes';

// Polityka: min. 8 znaków, min. 1 wielka, min. 1 mała, min. 1 cyfra.
const PASSWORD_RULES = [
    { test: (v: string) => v.length >= 8, label: 'Co najmniej 8 znaków' },
    { test: (v: string) => /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(v), label: 'Co najmniej 1 wielka litera' },
    { test: (v: string) => /[a-ząćęłńóśźż]/.test(v), label: 'Co najmniej 1 mała litera' },
    { test: (v: string) => /[0-9]/.test(v), label: 'Co najmniej 1 cyfra' },
];

const passwordIsValid = (v: string) => PASSWORD_RULES.every(r => r.test(v));

export interface ChangePasswordModalProps {
    employeeName: string;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (payload: ChangePasswordRequest) => void;
}

export function ChangePasswordModal({ employeeName, isSaving, onClose, onSubmit }: ChangePasswordModalProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        if (!passwordIsValid(newPassword)) {
            setError('Hasło nie spełnia wymagań polityki bezpieczeństwa.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Hasła nie są identyczne.');
            return;
        }
        onSubmit({ newPassword, confirmPassword });
    };

    return (
        <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
            <ModalCard $maxWidth={440}>
                <ModalHead>
                    <div>
                        <ModalTitle>Zmień hasło</ModalTitle>
                        <ModalSubtitle>Ustaw nowe hasło dla konta: {employeeName}</ModalSubtitle>
                    </div>
                    <ModalCloseBtn onClick={onClose} aria-label="Zamknij">
                        <CloseIcon />
                    </ModalCloseBtn>
                </ModalHead>

                <ModalBody>
                    <FormField>
                        <FieldLabel>Nowe hasło</FieldLabel>
                        <FieldInput
                            type="password"
                            value={newPassword}
                            onChange={e => { setNewPassword(e.target.value); setError(null); }}
                            autoFocus
                        />
                    </FormField>

                    <FormField>
                        <FieldLabel>Powtórz hasło</FieldLabel>
                        <FieldInput
                            type="password"
                            value={confirmPassword}
                            onChange={e => { setConfirmPassword(e.target.value); setError(null); }}
                            $error={confirmPassword !== '' && confirmPassword !== newPassword}
                        />
                    </FormField>

                    <Rules>
                        {PASSWORD_RULES.map(rule => {
                            const ok = rule.test(newPassword);
                            return (
                                <Rule key={rule.label} $ok={ok}>
                                    <RuleDot $ok={ok}>{ok ? <TinyCheck /> : null}</RuleDot>
                                    {rule.label}
                                </Rule>
                            );
                        })}
                    </Rules>

                    {error && <ErrorMsg>{error}</ErrorMsg>}
                </ModalBody>

                <ModalFooter>
                    <CancelBtn onClick={onClose} disabled={isSaving}>Anuluj</CancelBtn>
                    <SubmitBtn onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Zapisywanie…' : 'Zmień hasło'}
                    </SubmitBtn>
                </ModalFooter>
            </ModalCard>
        </Overlay>
    );
}

// ─── Local styled + icons ─────────────────────────────────────────────────────
const Rules = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    background: #f8fafc;
    border-radius: 9px;
`;

const Rule = styled.div<{ $ok: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: ${p => (p.$ok ? '#059669' : '#64748b')};
`;

const RuleDot = styled.span<{ $ok: boolean }>`
    width: 15px;
    height: 15px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    background: ${p => (p.$ok ? '#10b981' : '#cbd5e1')};
`;

const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const TinyCheck = () => (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
