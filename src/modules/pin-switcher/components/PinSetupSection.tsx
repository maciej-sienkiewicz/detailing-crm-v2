import { useState } from 'react';
import styled from 'styled-components';
import { usePinStatus, useSetPin } from '../hooks/usePinStatus';
import { useToast } from '@/common/components/Toast';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Card = styled.div`
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;

    /* Na telefonie ikona, opis i status w jednym rzędzie zostawiały opisowi
       ~190px — plakietka statusu schodzi wtedy pod tekst. */
    @media (max-width: 640px) {
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 10px 12px;
    }
`;

const IconBox = styled.div`
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: rgba(14, 165, 233, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #0ea5e9;
`;

const HeaderText = styled.div`
    flex: 1;
    min-width: 0;

    @media (max-width: 640px) { flex: 1 1 200px; }
`;

const CardTitle = styled.h3`
    margin: 0 0 2px;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const CardDesc = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
    line-height: 1.5;
`;

const StatusPill = styled.span<{ $configured: boolean }>`
    flex-shrink: 0;

    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 700;
    background: ${({ $configured }) => $configured ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)'};
    color: ${({ $configured }) => $configured ? '#059669' : '#64748b'};

    &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
    }
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid #f1f5f9;
    margin: 0;
`;

const Form = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const Label = styled.label`
    font-size: 12px;
    font-weight: 600;
    color: #475569;
`;

const Input = styled.input<{ $error?: boolean }>`
    padding: 9px 12px;
    border: 1px solid ${({ $error }) => $error ? '#ef4444' : '#e2e8f0'};
    border-radius: 8px;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
    outline: none;
    transition: border-color 150ms;
    &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.1); }
    letter-spacing: ${({ type }) => type === 'password' ? '0.2em' : 'normal'};
`;

const PinInput = styled(Input)`
    max-width: 160px;
    font-size: 20px;
    letter-spacing: 0.5em;
    text-align: center;
`;

const ErrorMsg = styled.p`
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: #ef4444;
`;

const BtnRow = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
`;

const PrimaryBtn = styled.button`
    padding: 9px 20px;
    background: #0ea5e9;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background 150ms;
    &:hover { background: #0284c7; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const GhostBtn = styled.button`
    padding: 9px 16px;
    background: none;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: all 150ms;
    &:hover { border-color: #94a3b8; color: #0f172a; }
`;

const SetPinBtn = styled.button`
    padding: 9px 20px;
    background: none;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 150ms;
    &:hover { background: #f8fafc; border-color: #cbd5e1; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

const PIN_REGEX = /^\d{4}$/;

export const PinSetupSection = () => {
    const { showSuccess, showError } = useToast();
    const { hasPinConfigured, isLoading } = usePinStatus();
    const setPin = useSetPin();

    const [isOpen, setIsOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [errors, setErrors] = useState<{ password?: string; pin?: string; confirm?: string }>({});

    const reset = () => {
        setIsOpen(false);
        setCurrentPassword('');
        setNewPin('');
        setConfirmPin('');
        setErrors({});
    };

    const validate = (): boolean => {
        const errs: typeof errors = {};
        if (!currentPassword) errs.password = 'Podaj aktualne hasło';
        if (!PIN_REGEX.test(newPin)) errs.pin = 'PIN musi zawierać dokładnie 4 cyfry';
        if (newPin !== confirmPin) errs.confirm = 'Kody PIN nie są zgodne';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        setPin.mutate(
            { currentPassword, pin: newPin },
            {
                onSuccess: () => {
                    showSuccess(
                        hasPinConfigured ? 'Kod PIN zaktualizowany' : 'Kod PIN ustawiony',
                        'Możesz teraz korzystać z szybkiego przełączania konta.'
                    );
                    reset();
                },
                onError: (err: unknown) => {
                    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    if (msg?.toLowerCase().includes('hasło') || msg?.toLowerCase().includes('password')) {
                        setErrors(e => ({ ...e, password: 'Nieprawidłowe hasło' }));
                    } else {
                        showError('Błąd', msg ?? 'Nie udało się ustawić kodu PIN');
                    }
                },
            }
        );
    };

    return (
        <Card>
            <Header>
                <IconBox>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        <circle cx="12" cy="16" r="1" fill="currentColor"/>
                    </svg>
                </IconBox>
                <HeaderText>
                    <CardTitle>Kod PIN do szybkiego logowania</CardTitle>
                    <CardDesc>
                        Ustaw 4-cyfrowy kod PIN, który umożliwi szybkie przełączanie kont
                        na jednym komputerze bez wylogowywania się.
                    </CardDesc>
                </HeaderText>
                {!isLoading && (
                    <StatusPill $configured={hasPinConfigured}>
                        {hasPinConfigured ? 'Skonfigurowany' : 'Nieskonfigurowany'}
                    </StatusPill>
                )}
            </Header>

            {!isOpen ? (
                <SetPinBtn onClick={() => setIsOpen(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        {hasPinConfigured
                            ? <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></>
                            : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
                        }
                    </svg>
                    {hasPinConfigured ? 'Zmień kod PIN' : 'Ustaw kod PIN'}
                </SetPinBtn>
            ) : (
                <>
                    <Divider />
                    <Form>
                        <Field>
                            <Label>Aktualne hasło do konta *</Label>
                            <Input
                                type="password"
                                placeholder="Twoje hasło logowania"
                                value={currentPassword}
                                onChange={e => { setCurrentPassword(e.target.value); setErrors(er => ({ ...er, password: undefined })); }}
                                $error={!!errors.password}
                                autoFocus
                            />
                            {errors.password && <ErrorMsg>{errors.password}</ErrorMsg>}
                        </Field>

                        <Field>
                            <Label>Nowy kod PIN (4 cyfry) *</Label>
                            <PinInput
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={newPin}
                                onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors(er => ({ ...er, pin: undefined })); }}
                                $error={!!errors.pin}
                            />
                            {errors.pin && <ErrorMsg>{errors.pin}</ErrorMsg>}
                        </Field>

                        <Field>
                            <Label>Powtórz kod PIN *</Label>
                            <PinInput
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={confirmPin}
                                onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors(er => ({ ...er, confirm: undefined })); }}
                                $error={!!errors.confirm}
                            />
                            {errors.confirm && <ErrorMsg>{errors.confirm}</ErrorMsg>}
                        </Field>

                        <BtnRow>
                            <PrimaryBtn onClick={handleSubmit} disabled={setPin.isPending}>
                                {setPin.isPending ? 'Zapisywanie...' : hasPinConfigured ? 'Zaktualizuj PIN' : 'Zapisz PIN'}
                            </PrimaryBtn>
                            <GhostBtn onClick={reset}>Anuluj</GhostBtn>
                        </BtnRow>
                    </Form>
                </>
            )}
        </Card>
    );
};
