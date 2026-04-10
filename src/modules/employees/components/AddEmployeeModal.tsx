import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployees';
import type { EmployeeDetail, CreateEmployeePayload } from '../types';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: ${st.bgOverlay};
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
`;

const Modal = styled.div`
    background: ${st.bgCard};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    width: 100%;
    max-width: 640px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const Header = styled.div`
    padding: 20px 24px;
    border-bottom: 1px solid ${st.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const Title = styled.h2`
    margin: 0;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
`;

const CloseBtn = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    color: ${st.textMuted};
    font-size: 20px;
    line-height: 1;
    padding: 4px;
    border-radius: ${st.radiusSm};
    transition: color ${st.transition};
    &:hover { color: ${st.text}; }
`;

const Body = styled.div`
    padding: 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const SectionTitle = styled.p`
    margin: 0 0 12px 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

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

const Footer = styled.div`
    padding: 16px 24px;
    border-top: 1px solid ${st.border};
    display: flex;
    justify-content: flex-end;
    gap: 10px;
`;

const CancelBtn = styled.button`
    padding: 9px 20px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { border-color: ${st.borderHover}; color: ${st.text}; }
`;

const SaveBtn = styled.button`
    padding: 9px 24px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: #1D4ED8; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
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

    if (!isOpen) return null;

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
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <Header>
                    <Title>{isEdit ? 'Edytuj pracownika' : 'Dodaj pracownika'}</Title>
                    <CloseBtn onClick={onClose}>×</CloseBtn>
                </Header>

                <Body>
                    <div>
                        <SectionTitle>Dane podstawowe</SectionTitle>
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
                        <SectionTitle>Kontakt</SectionTitle>
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
                        <SectionTitle>Dane formalne</SectionTitle>
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
                        <SectionTitle>Adres zamieszkania</SectionTitle>
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
                </Body>

                <Footer>
                    <CancelBtn onClick={onClose}>Anuluj</CancelBtn>
                    <SaveBtn onClick={handleSubmit} disabled={isPending}>
                        {isPending ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Dodaj pracownika'}
                    </SaveBtn>
                </Footer>
            </Modal>
        </Overlay>
    );
};
