import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    ModalSectionTitle,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployees';
import { useRoles } from '@/modules/settings/hooks/useRoles';
import type { EmployeeDetail, CreateEmployeePayload } from '../types';

const Row = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
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

const Input = styled.input`
    padding: 9px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    transition: border-color ${st.transition};
    &:focus { border-color: ${st.accentBlue}; }
    &::placeholder { color: ${st.textMuted}; }
`;

const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
`;

const Select = styled.select`
    padding: 9px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    transition: border-color ${st.transition};
    &:focus { border-color: ${st.accentBlue}; }
    appearance: auto;
`;

const CheckboxLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    cursor: pointer;
`;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employee?: EmployeeDetail;
}

const emptyForm = (): CreateEmployeePayload => ({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    createAccount: false,
    roleId: null,
});

export const AddEmployeeModal = ({ isOpen, onClose, onSuccess, employee }: Props) => {
    const isEdit = !!employee;
    const [form, setForm] = useState<CreateEmployeePayload>(
        employee
            ? {
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  phone: employee.phone ?? '',
                  email: employee.email ?? '',
              }
            : emptyForm()
    );
    const [error, setError] = useState('');

    const createMutation = useCreateEmployee();
    const updateMutation = useUpdateEmployee(employee?.id ?? '');
    const { roles } = useRoles();

    const set = (key: keyof CreateEmployeePayload, value: string | boolean | null) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = async () => {
        if (!form.firstName.trim() || !form.lastName.trim()) {
            setError('Imię i nazwisko są wymagane.');
            return;
        }
        if (form.createAccount && !form.email?.trim()) {
            setError('Adres e-mail jest wymagany przy tworzeniu konta użytkownika.');
            return;
        }
        setError('');
        const payload: CreateEmployeePayload = {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: form.phone?.trim() || null,
            email: form.email?.trim() || null,
            ...(isEdit ? {} : { createAccount: form.createAccount, roleId: form.roleId || null }),
        };

        try {
            if (isEdit) {
                await updateMutation.mutateAsync(payload);
            } else {
                await createMutation.mutateAsync(payload);
            }
            onSuccess();
            onClose();
        } catch {
            setError('Wystąpił błąd. Spróbuj ponownie.');
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="640px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{isEdit ? 'Edytuj pracownika' : 'Dodaj pracownika'}</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <div>
                    <ModalSectionTitle>Dane podstawowe</ModalSectionTitle>
                    <Row>
                        <Field>
                            <Label>Imię *</Label>
                            <Input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Jan" />
                        </Field>
                        <Field>
                            <Label>Nazwisko *</Label>
                            <Input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Kowalski" />
                        </Field>
                    </Row>
                </div>

                <div>
                    <ModalSectionTitle>Kontakt</ModalSectionTitle>
                    <Row>
                        <Field>
                            <Label>Email</Label>
                            <Input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="jan@firma.pl" />
                        </Field>
                        <Field>
                            <Label>Telefon</Label>
                            <Input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+48 123 456 789" />
                        </Field>
                    </Row>
                </div>

                {!isEdit && (
                    <div>
                        <ModalSectionTitle>Konto i dostęp</ModalSectionTitle>
                        <CheckboxLabel>
                            <input
                                type="checkbox"
                                checked={!!form.createAccount}
                                onChange={e => set('createAccount', e.target.checked)}
                            />
                            Utwórz konto użytkownika i wyślij zaproszenie
                        </CheckboxLabel>
                        {form.createAccount && (
                            <Field style={{ marginTop: 12 }}>
                                <Label>Rola systemowa</Label>
                                <Select
                                    value={form.roleId ?? ''}
                                    onChange={e => set('roleId', e.target.value || null)}
                                >
                                    <option value="">— bez roli —</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </Select>
                            </Field>
                        )}
                    </div>
                )}

                {error && <ErrorMsg>{error}</ErrorMsg>}
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton $variant="primary" type="button" onClick={handleSubmit} disabled={isPending}>
                    {isPending ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Dodaj pracownika'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
