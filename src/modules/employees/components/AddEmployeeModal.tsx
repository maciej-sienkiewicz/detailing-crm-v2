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

const Textarea = styled.textarea`
    padding: 9px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    resize: vertical;
    min-height: 72px;
    font-family: inherit;
    transition: border-color ${st.transition};
    &:focus { border-color: ${st.accentBlue}; }
    &::placeholder { color: ${st.textMuted}; }
`;

const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
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
    position: '',
    hireDate: new Date().toISOString().slice(0, 10),
    phone: '',
    email: '',
    personalEmail: '',
    pesel: '',
    nip: '',
    addressStreet: '',
    addressCity: '',
    addressPostalCode: '',
    notes: '',
});

export const AddEmployeeModal = ({ isOpen, onClose, onSuccess, employee }: Props) => {
    const isEdit = !!employee;
    const [form, setForm] = useState<CreateEmployeePayload>(
        employee
            ? {
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  position: employee.position,
                  hireDate: employee.hireDate,
                  phone: employee.phone ?? '',
                  email: employee.email ?? '',
                  personalEmail: employee.personalEmail ?? '',
                  pesel: employee.pesel ?? '',
                  nip: employee.nip ?? '',
                  addressStreet: employee.addressStreet ?? '',
                  addressCity: employee.addressCity ?? '',
                  addressPostalCode: employee.addressPostalCode ?? '',
                  notes: employee.notes ?? '',
              }
            : emptyForm()
    );
    const [error, setError] = useState('');

    const createMutation = useCreateEmployee();
    const updateMutation = useUpdateEmployee(employee?.id ?? '');

    const set = (key: keyof CreateEmployeePayload, value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = async () => {
        if (!form.firstName.trim() || !form.lastName.trim() || !form.position.trim() || !form.hireDate) {
            setError('Imię, nazwisko, stanowisko i data zatrudnienia są wymagane.');
            return;
        }
        setError('');
        const payload: CreateEmployeePayload = {
            ...form,
            phone: form.phone || null,
            email: form.email || null,
            personalEmail: form.personalEmail || null,
            pesel: form.pesel || null,
            nip: form.nip || null,
            addressStreet: form.addressStreet || null,
            addressCity: form.addressCity || null,
            addressPostalCode: form.addressPostalCode || null,
            notes: form.notes || null,
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
                    <Row style={{ marginTop: 12 }}>
                        <Field>
                            <Label>Stanowisko *</Label>
                            <Input value={form.position} onChange={e => set('position', e.target.value)} placeholder="Detailer" />
                        </Field>
                        <Field>
                            <Label>Data zatrudnienia *</Label>
                            <Input type="date" value={form.hireDate} onChange={e => set('hireDate', e.target.value)} />
                        </Field>
                    </Row>
                </div>

                <div>
                    <ModalSectionTitle>Kontakt</ModalSectionTitle>
                    <Row>
                        <Field>
                            <Label>Email służbowy</Label>
                            <Input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="jan@firma.pl" />
                        </Field>
                        <Field>
                            <Label>Telefon</Label>
                            <Input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+48 123 456 789" />
                        </Field>
                    </Row>
                    <Row style={{ marginTop: 12 }}>
                        <Field>
                            <Label>Email prywatny</Label>
                            <Input type="email" value={form.personalEmail ?? ''} onChange={e => set('personalEmail', e.target.value)} placeholder="jan@gmail.com" />
                        </Field>
                    </Row>
                </div>

                <div>
                    <ModalSectionTitle>Dane formalne</ModalSectionTitle>
                    <Row>
                        <Field>
                            <Label>PESEL</Label>
                            <Input value={form.pesel ?? ''} onChange={e => set('pesel', e.target.value)} placeholder="00000000000" maxLength={11} />
                        </Field>
                        <Field>
                            <Label>NIP</Label>
                            <Input value={form.nip ?? ''} onChange={e => set('nip', e.target.value)} placeholder="0000000000" maxLength={10} />
                        </Field>
                    </Row>
                </div>

                <div>
                    <ModalSectionTitle>Adres zamieszkania</ModalSectionTitle>
                    <Field>
                        <Label>Ulica</Label>
                        <Input value={form.addressStreet ?? ''} onChange={e => set('addressStreet', e.target.value)} placeholder="ul. Przykładowa 1" />
                    </Field>
                    <Row style={{ marginTop: 12 }}>
                        <Field>
                            <Label>Miasto</Label>
                            <Input value={form.addressCity ?? ''} onChange={e => set('addressCity', e.target.value)} placeholder="Warszawa" />
                        </Field>
                        <Field>
                            <Label>Kod pocztowy</Label>
                            <Input value={form.addressPostalCode ?? ''} onChange={e => set('addressPostalCode', e.target.value)} placeholder="00-000" maxLength={6} />
                        </Field>
                    </Row>
                </div>

                <Field>
                    <Label>Notatki</Label>
                    <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Dodatkowe informacje..." />
                </Field>

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
