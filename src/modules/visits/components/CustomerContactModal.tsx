/**
 * Uzupełnienie telefonu / e-maila klienta wprost z karty wizyty.
 *
 * Bez tego okna brak kontaktu był ślepym zaułkiem: trzeba było wyjść z wizyty,
 * otworzyć profil klienta, poprawić dane i wrócić - a numer telefonu najczęściej
 * dopisuje się właśnie wtedy, gdy patrzy się na wizytę i trzeba zadzwonić.
 */

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { useUpdateCustomer } from '@/modules/customers/hooks/useUpdateCustomer';
import { useToast } from '@/common/components/Toast';
import { visitDetailQueryKey } from '../hooks';

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;

    & + & { margin-top: 16px; }
`;

const LabelRow = styled.div`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
`;

const Label = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: #374151;
`;

const LabelNote = styled.span`
    font-size: 11px;
    font-weight: 500;
    color: #94a3b8;
`;

const Input = styled.input`
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    font-family: inherit;
    color: #0f172a;
    background: #fff;
    box-sizing: border-box;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &:focus {
        outline: none;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }

    &::placeholder { color: #94a3b8; }
`;

const FieldError = styled.p`
    margin: 0;
    font-size: 12px;
    color: #dc2626;
`;

const BtnPrimary = styled.button`
    padding: 10px 20px;
    background: #0ea5e9;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 150ms ease;

    &:hover:not(:disabled) { background: #0284c7; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const BtnGhost = styled.button`
    padding: 10px 20px;
    background: transparent;
    color: #64748b;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;

    &:hover { background: #f8fafc; border-color: #cbd5e1; }
`;

const Header = styled(ModalHeader)`
    align-items: center;
`;

/** Luźna walidacja: ma odsiać literówkę, a nie sprawdzać istnienie skrzynki. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface CustomerContactModalProps {
    isOpen: boolean;
    customerId: string;
    visitId?: string;
    initialPhone?: string;
    initialEmail?: string;
    /** Pole, które ma dostać kursor: to, od którego zaczął użytkownik. */
    focusField?: 'phone' | 'email';
    onClose: () => void;
}

export const CustomerContactModal = ({
    isOpen, customerId, visitId, initialPhone, initialEmail, focusField = 'phone', onClose,
}: CustomerContactModalProps) => {
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [touched, setTouched] = useState(false);
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();

    useEffect(() => {
        if (!isOpen) return;
        setPhone(initialPhone ?? '');
        setEmail(initialEmail ?? '');
        setTouched(false);
    }, [isOpen, initialPhone, initialEmail]);

    const { updateCustomer, isUpdating } = useUpdateCustomer({
        customerId,
        onSuccess: () => {
            /* Karta wizyty czyta klienta z zapytania o wizytę, nie z kartoteki,
               więc bez tego unieważnienia nowy numer pojawiłby się dopiero po
               odświeżeniu strony. */
            if (visitId) queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId) });
            showSuccess('Dane kontaktowe zaktualizowane');
            onClose();
        },
        onError: () => showError('Nie udało się zapisać danych kontaktowych'),
    });

    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const emailInvalid = trimmedEmail.length > 0 && !EMAIL_RE.test(trimmedEmail);
    const nothingFilled = trimmedPhone.length === 0 && trimmedEmail.length === 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (emailInvalid || nothingFilled) return;
        updateCustomer({ contact: { phone: trimmedPhone || null, email: trimmedEmail || null } });
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="440px">
            <Header>
                <ModalTitleGroup>
                    <ModalTitle>Dane kontaktowe klienta</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} aria-label="Zamknij" />
            </Header>

            <form onSubmit={handleSubmit}>
                <ModalContent>
                    <Field>
                        <LabelRow>
                            <Label htmlFor="cc-phone">Telefon</Label>
                            <LabelNote>Opcjonalne</LabelNote>
                        </LabelRow>
                        <Input
                            id="cc-phone"
                            type="tel"
                            autoFocus={focusField === 'phone'}
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="np. +48 600 100 200"
                        />
                    </Field>

                    <Field>
                        <LabelRow>
                            <Label htmlFor="cc-email">E-mail</Label>
                            <LabelNote>Opcjonalne</LabelNote>
                        </LabelRow>
                        <Input
                            id="cc-email"
                            type="email"
                            autoFocus={focusField === 'email'}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="np. jan.kowalski@firma.pl"
                        />
                        {touched && emailInvalid && <FieldError>Sprawdź adres e-mail</FieldError>}
                    </Field>

                    {touched && nothingFilled && (
                        <FieldError style={{ marginTop: 12 }}>Uzupełnij telefon albo e-mail</FieldError>
                    )}
                </ModalContent>

                <ModalFooter>
                    <BtnGhost type="button" onClick={onClose}>Anuluj</BtnGhost>
                    <BtnPrimary type="submit" disabled={isUpdating}>
                        {isUpdating ? 'Zapisuję...' : 'Zapisz'}
                    </BtnPrimary>
                </ModalFooter>
            </form>
        </ModalShell>
    );
};
