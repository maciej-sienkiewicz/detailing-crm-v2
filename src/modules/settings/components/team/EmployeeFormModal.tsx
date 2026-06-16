import { useState } from 'react';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, FormGrid, FormField, FieldLabel, FieldInput,
    FieldTextarea, FieldSelect, ErrorMsg, HintText, CancelBtn, SubmitBtn,
    CheckRow, CheckBox,
} from '../rbacShared.styles';
import type {
    TeamEmployeeDetail, CreateEmployeeRequest, UpdateEmployeeRequest, AssignableAccountRole,
} from '../../teamTypes';

const ACCOUNT_ROLE_LABELS: Record<AssignableAccountRole, string> = {
    MANAGER: 'Menedżer',
    DETAILER: 'Pracownik (detailer)',
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

interface FormValues {
    firstName: string;
    lastName: string;
    position: string;
    hireDate: string;
    phone: string;
    email: string;
    personalEmail: string;
    pesel: string;
    nip: string;
    addressStreet: string;
    addressCity: string;
    addressPostalCode: string;
    notes: string;
    createAccount: boolean;
    accountEmail: string;
    accountRole: AssignableAccountRole;
}

function emptyForm(): FormValues {
    return {
        firstName: '', lastName: '', position: '', hireDate: '',
        phone: '', email: '', personalEmail: '', pesel: '', nip: '',
        addressStreet: '', addressCity: '', addressPostalCode: '', notes: '',
        createAccount: false, accountEmail: '', accountRole: 'DETAILER',
    };
}

function fromDetail(d: TeamEmployeeDetail): FormValues {
    return {
        firstName: d.firstName, lastName: d.lastName, position: d.position,
        hireDate: d.hireDate, phone: d.phone ?? '', email: d.email ?? '',
        personalEmail: d.personalEmail ?? '', pesel: d.pesel ?? '', nip: d.nip ?? '',
        addressStreet: d.addressStreet ?? '', addressCity: d.addressCity ?? '',
        addressPostalCode: d.addressPostalCode ?? '', notes: d.notes ?? '',
        createAccount: false, accountEmail: '', accountRole: 'DETAILER',
    };
}

type Errors = Partial<Record<keyof FormValues, string>>;

const orNull = (v: string): string | null => {
    const t = v.trim();
    return t === '' ? null : t;
};

export interface EmployeeFormModalProps {
    mode: 'add' | 'edit';
    employee?: TeamEmployeeDetail | null;
    isSaving: boolean;
    onClose: () => void;
    onSubmitCreate: (payload: CreateEmployeeRequest) => void;
    onSubmitUpdate: (payload: UpdateEmployeeRequest) => void;
}

export function EmployeeFormModal({
    mode, employee, isSaving, onClose, onSubmitCreate, onSubmitUpdate,
}: EmployeeFormModalProps) {
    const [values, setValues] = useState<FormValues>(
        mode === 'edit' && employee ? fromDetail(employee) : emptyForm(),
    );
    const [errors, setErrors] = useState<Errors>({});

    const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
        setValues(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const validate = (): Errors => {
        const e: Errors = {};
        if (!values.firstName.trim()) e.firstName = 'Imię jest wymagane';
        if (!values.lastName.trim()) e.lastName = 'Nazwisko jest wymagane';
        if (!values.position.trim()) e.position = 'Stanowisko jest wymagane';
        if (!values.hireDate) e.hireDate = 'Data zatrudnienia jest wymagana';
        if (values.email.trim() && !isEmail(values.email)) e.email = 'Nieprawidłowy adres e-mail';
        if (values.personalEmail.trim() && !isEmail(values.personalEmail)) {
            e.personalEmail = 'Nieprawidłowy adres e-mail';
        }
        if (mode === 'add' && values.createAccount) {
            if (!values.accountEmail.trim()) e.accountEmail = 'Adres e-mail konta jest wymagany';
            else if (!isEmail(values.accountEmail)) e.accountEmail = 'Nieprawidłowy adres e-mail';
        }
        return e;
    };

    const handleSubmit = () => {
        const e = validate();
        if (Object.keys(e).length > 0) { setErrors(e); return; }

        if (mode === 'add') {
            const payload: CreateEmployeeRequest = {
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                position: values.position.trim(),
                hireDate: values.hireDate,
                phone: orNull(values.phone),
                email: orNull(values.email),
                personalEmail: orNull(values.personalEmail),
                pesel: orNull(values.pesel),
                nip: orNull(values.nip),
                addressStreet: orNull(values.addressStreet),
                addressCity: orNull(values.addressCity),
                addressPostalCode: orNull(values.addressPostalCode),
                notes: orNull(values.notes),
                createAccount: values.createAccount,
            };
            if (values.createAccount) {
                payload.accountEmail = values.accountEmail.trim();
                payload.accountRole = values.accountRole;
            }
            onSubmitCreate(payload);
        } else {
            const payload: UpdateEmployeeRequest = {
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                position: values.position.trim(),
                hireDate: values.hireDate,
                phone: orNull(values.phone),
                email: orNull(values.email),
                personalEmail: orNull(values.personalEmail),
                pesel: orNull(values.pesel),
                nip: orNull(values.nip),
                addressStreet: orNull(values.addressStreet),
                addressCity: orNull(values.addressCity),
                addressPostalCode: orNull(values.addressPostalCode),
                notes: orNull(values.notes),
            };
            onSubmitUpdate(payload);
        }
    };

    return (
        <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
            <ModalCard $maxWidth={620}>
                <ModalHead>
                    <div>
                        <ModalTitle>{mode === 'add' ? 'Nowy pracownik' : 'Edytuj pracownika'}</ModalTitle>
                        <ModalSubtitle>
                            {mode === 'add'
                                ? 'Dodaj pracownika do firmy. Konto użytkownika jest opcjonalne.'
                                : 'Zaktualizuj dane pracownika.'}
                        </ModalSubtitle>
                    </div>
                    <ModalCloseBtn onClick={onClose} aria-label="Zamknij">
                        <CloseIcon />
                    </ModalCloseBtn>
                </ModalHead>

                <ModalBody>
                    <FormGrid>
                        <FormField>
                            <FieldLabel>Imię<span>*</span></FieldLabel>
                            <FieldInput
                                value={values.firstName}
                                onChange={e => set('firstName', e.target.value)}
                                $error={!!errors.firstName}
                                autoFocus
                            />
                            {errors.firstName && <ErrorMsg>{errors.firstName}</ErrorMsg>}
                        </FormField>
                        <FormField>
                            <FieldLabel>Nazwisko<span>*</span></FieldLabel>
                            <FieldInput
                                value={values.lastName}
                                onChange={e => set('lastName', e.target.value)}
                                $error={!!errors.lastName}
                            />
                            {errors.lastName && <ErrorMsg>{errors.lastName}</ErrorMsg>}
                        </FormField>
                    </FormGrid>

                    <FormGrid>
                        <FormField>
                            <FieldLabel>Stanowisko<span>*</span></FieldLabel>
                            <FieldInput
                                placeholder="np. Detailer"
                                value={values.position}
                                onChange={e => set('position', e.target.value)}
                                $error={!!errors.position}
                            />
                            {errors.position && <ErrorMsg>{errors.position}</ErrorMsg>}
                        </FormField>
                        <FormField>
                            <FieldLabel>Data zatrudnienia<span>*</span></FieldLabel>
                            <FieldInput
                                type="date"
                                value={values.hireDate}
                                onChange={e => set('hireDate', e.target.value)}
                                $error={!!errors.hireDate}
                            />
                            {errors.hireDate && <ErrorMsg>{errors.hireDate}</ErrorMsg>}
                        </FormField>
                    </FormGrid>

                    <FormGrid>
                        <FormField>
                            <FieldLabel>Telefon</FieldLabel>
                            <FieldInput
                                placeholder="+48 600 000 000"
                                value={values.phone}
                                onChange={e => set('phone', e.target.value)}
                            />
                        </FormField>
                        <FormField>
                            <FieldLabel>E-mail służbowy</FieldLabel>
                            <FieldInput
                                placeholder="sluzbowy@firma.pl"
                                value={values.email}
                                onChange={e => set('email', e.target.value)}
                                $error={!!errors.email}
                            />
                            {errors.email && <ErrorMsg>{errors.email}</ErrorMsg>}
                        </FormField>
                    </FormGrid>

                    <FormGrid $cols={3}>
                        <FormField>
                            <FieldLabel>E-mail prywatny</FieldLabel>
                            <FieldInput
                                placeholder="prywatny@email.com"
                                value={values.personalEmail}
                                onChange={e => set('personalEmail', e.target.value)}
                                $error={!!errors.personalEmail}
                            />
                            {errors.personalEmail && <ErrorMsg>{errors.personalEmail}</ErrorMsg>}
                        </FormField>
                        <FormField>
                            <FieldLabel>PESEL</FieldLabel>
                            <FieldInput
                                value={values.pesel}
                                onChange={e => set('pesel', e.target.value)}
                            />
                        </FormField>
                        <FormField>
                            <FieldLabel>NIP</FieldLabel>
                            <FieldInput
                                value={values.nip}
                                onChange={e => set('nip', e.target.value)}
                            />
                        </FormField>
                    </FormGrid>

                    <FormField>
                        <FieldLabel>Adres — ulica i numer</FieldLabel>
                        <FieldInput
                            placeholder="ul. Przykładowa 1"
                            value={values.addressStreet}
                            onChange={e => set('addressStreet', e.target.value)}
                        />
                    </FormField>

                    <FormGrid>
                        <FormField>
                            <FieldLabel>Miasto</FieldLabel>
                            <FieldInput
                                value={values.addressCity}
                                onChange={e => set('addressCity', e.target.value)}
                            />
                        </FormField>
                        <FormField>
                            <FieldLabel>Kod pocztowy</FieldLabel>
                            <FieldInput
                                placeholder="00-001"
                                value={values.addressPostalCode}
                                onChange={e => set('addressPostalCode', e.target.value)}
                            />
                        </FormField>
                    </FormGrid>

                    <FormField>
                        <FieldLabel>Notatki</FieldLabel>
                        <FieldTextarea
                            value={values.notes}
                            onChange={e => set('notes', e.target.value)}
                        />
                    </FormField>

                    {/* Account creation — only when adding */}
                    {mode === 'add' && (
                        <AccountBox>
                            <CheckRow onClick={() => set('createAccount', !values.createAccount)}>
                                <CheckBox $checked={values.createAccount}>
                                    {values.createAccount && <TinyCheck />}
                                </CheckBox>
                                <div>
                                    <AccountBoxTitle>Utwórz konto użytkownika</AccountBoxTitle>
                                    <HintText>
                                        Na podany adres zostanie wysłane zaproszenie z linkiem do ustawienia hasła.
                                    </HintText>
                                </div>
                            </CheckRow>

                            {values.createAccount && (
                                <FormGrid style={{ marginTop: 14 }}>
                                    <FormField>
                                        <FieldLabel>E-mail konta (login)<span>*</span></FieldLabel>
                                        <FieldInput
                                            placeholder="login@firma.pl"
                                            value={values.accountEmail}
                                            onChange={e => set('accountEmail', e.target.value)}
                                            $error={!!errors.accountEmail}
                                        />
                                        {errors.accountEmail && <ErrorMsg>{errors.accountEmail}</ErrorMsg>}
                                    </FormField>
                                    <FormField>
                                        <FieldLabel>Rola konta<span>*</span></FieldLabel>
                                        <FieldSelect
                                            value={values.accountRole}
                                            onChange={e => set('accountRole', e.target.value as AssignableAccountRole)}
                                        >
                                            {(Object.keys(ACCOUNT_ROLE_LABELS) as AssignableAccountRole[]).map(r => (
                                                <option key={r} value={r}>{ACCOUNT_ROLE_LABELS[r]}</option>
                                            ))}
                                        </FieldSelect>
                                    </FormField>
                                </FormGrid>
                            )}
                        </AccountBox>
                    )}
                </ModalBody>

                <ModalFooter>
                    <CancelBtn onClick={onClose} disabled={isSaving}>Anuluj</CancelBtn>
                    <SubmitBtn onClick={handleSubmit} disabled={isSaving}>
                        {isSaving
                            ? 'Zapisywanie…'
                            : mode === 'add' ? 'Dodaj pracownika' : 'Zapisz zmiany'}
                    </SubmitBtn>
                </ModalFooter>
            </ModalCard>
        </Overlay>
    );
}

// ─── Local styled + icons ─────────────────────────────────────────────────────
import styled from 'styled-components';

const AccountBox = styled.div`
    padding: 16px;
    border: 1.5px dashed #cbd5e1;
    border-radius: 10px;
    background: #fafbfc;
`;

const AccountBoxTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 2px;
`;

const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const TinyCheck = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
