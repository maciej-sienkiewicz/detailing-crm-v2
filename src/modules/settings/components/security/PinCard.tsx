import { useState } from 'react';
import styled from 'styled-components';
import { usePinStatus, useSetPin } from '@/modules/pin-switcher/hooks/usePinStatus';
import { useToast } from '@/common/components/Toast';
import {
    Card, CardHead, CardHeadText, CardTitle, CardNote, CardActions,
    OutlineBtn, PrimaryBtn, GhostBtn, StateTag, Input, FieldError,
} from './SecurityCard';

/**
 * Kod PIN do szybkiego przełączania kont.
 *
 * Karta mieszka w ustawieniach, a nie w module pin-switcher, bo o jej wygląd decyduje
 * zakładka „Bezpieczeństwo" — logika (status, zapis) zostaje tam, gdzie była.
 *
 * Zwinięta pokazuje jedno: czy PIN jest ustawiony. Rozwinięta jest EDYTOREM, więc jako
 * jedyne miejsce na tym ekranie ma prawo do wypełnionego przycisku (CLAUDE.md §2).
 */

const Form = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 14px;
    border-top: 1px solid #f1f5f9;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    max-width: 320px;
`;

const FieldLabel = styled.label`
    font-size: 12.5px;
    font-weight: 600;
    color: #475569;
`;

const PinInput = styled(Input)`
    max-width: 150px;
    font-size: 18px;
    letter-spacing: 0.45em;
    text-align: center;
`;

const Buttons = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const PIN_REGEX = /^\d{4}$/;

export const PinCard = () => {
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
        if (!PIN_REGEX.test(newPin)) errs.pin = 'PIN musi mieć 4 cyfry';
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
                        hasPinConfigured ? 'Kod PIN zmieniony' : 'Kod PIN ustawiony',
                        'Możesz przełączać konta bez wylogowania.'
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
            <CardHead>
                <CardHeadText>
                    <CardTitle>Kod PIN</CardTitle>
                    <CardNote>Przełączanie kont na jednym komputerze bez wylogowania.</CardNote>
                </CardHeadText>
                <CardActions>
                    {!isLoading && (
                        <StateTag $on={hasPinConfigured}>
                            {hasPinConfigured ? 'Ustawiony' : 'Nieustawiony'}
                        </StateTag>
                    )}
                    {!isOpen && (
                        <OutlineBtn onClick={() => setIsOpen(true)}>
                            {hasPinConfigured ? 'Zmień' : 'Ustaw'}
                        </OutlineBtn>
                    )}
                </CardActions>
            </CardHead>

            {isOpen && (
                <Form>
                    <Field>
                        <FieldLabel htmlFor="pin-password">Aktualne hasło</FieldLabel>
                        <Input
                            id="pin-password"
                            type="password"
                            value={currentPassword}
                            onChange={e => { setCurrentPassword(e.target.value); setErrors(er => ({ ...er, password: undefined })); }}
                            $error={!!errors.password}
                            autoFocus
                        />
                        {errors.password && <FieldError>{errors.password}</FieldError>}
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="pin-new">Nowy PIN</FieldLabel>
                        <PinInput
                            id="pin-new"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="••••"
                            value={newPin}
                            onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors(er => ({ ...er, pin: undefined })); }}
                            $error={!!errors.pin}
                        />
                        {errors.pin && <FieldError>{errors.pin}</FieldError>}
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="pin-confirm">Powtórz PIN</FieldLabel>
                        <PinInput
                            id="pin-confirm"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="••••"
                            value={confirmPin}
                            onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors(er => ({ ...er, confirm: undefined })); }}
                            $error={!!errors.confirm}
                        />
                        {errors.confirm && <FieldError>{errors.confirm}</FieldError>}
                    </Field>

                    <Buttons>
                        <PrimaryBtn onClick={handleSubmit} disabled={setPin.isPending}>
                            {setPin.isPending ? 'Zapisywanie…' : 'Zapisz'}
                        </PrimaryBtn>
                        <GhostBtn onClick={reset} disabled={setPin.isPending}>Anuluj</GhostBtn>
                    </Buttons>
                </Form>
            )}
        </Card>
    );
};
