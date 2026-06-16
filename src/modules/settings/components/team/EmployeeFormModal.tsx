import { useState } from 'react';
import styled from 'styled-components';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, FormGrid, FormField, FieldLabel, FieldInput,
    FieldSelect, ErrorMsg, HintText, CancelBtn, SubmitBtn,
    CheckRow, CheckBox,
} from '../rbacShared.styles';
import { useRoles } from '../../hooks/useRoles';
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
    phone: string;
    email: string;
    createAccount: boolean;
    accountEmail: string;
    accountRole: AssignableAccountRole;
    rbacRoleId: string;
}

function emptyForm(): FormValues {
    return {
        firstName: '', lastName: '',
        phone: '', email: '',
        createAccount: false, accountEmail: '', accountRole: 'DETAILER', rbacRoleId: '',
    };
}

function fromDetail(d: TeamEmployeeDetail): FormValues {
    return {
        firstName: d.firstName, lastName: d.lastName,
        phone: d.phone ?? '', email: d.email ?? '',
        createAccount: false, accountEmail: '', accountRole: 'DETAILER', rbacRoleId: '',
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
    onSubmitCreate: (payload: CreateEmployeeRequest, rbacRoleId?: string) => void;
    onSubmitUpdate: (payload: UpdateEmployeeRequest) => void;
}

export function EmployeeFormModal({
    mode, employee, isSaving, onClose, onSubmitCreate, onSubmitUpdate,
}: EmployeeFormModalProps) {
    const { roles } = useRoles();
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
        if (values.email.trim() && !isEmail(values.email)) e.email = 'Nieprawidłowy adres e-mail';
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
                phone: orNull(values.phone),
                email: orNull(values.email),
                createAccount: values.createAccount,
            };
            if (values.createAccount) {
                payload.accountEmail = values.accountEmail.trim();
                payload.accountRole = values.accountRole;
            }
            onSubmitCreate(payload, values.createAccount && values.rbacRoleId ? values.rbacRoleId : undefined);
        } else {
            const payload: UpdateEmployeeRequest = {
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                phone: orNull(values.phone),
                email: orNull(values.email),
            };
            onSubmitUpdate(payload);
        }
    };

    return (
        <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
            <ModalCard $maxWidth={520}>
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
                            <FieldLabel>Telefon</FieldLabel>
                            <FieldInput
                                placeholder="+48 600 000 000"
                                value={values.phone}
                                onChange={e => set('phone', e.target.value)}
                            />
                        </FormField>
                        <FormField>
                            <FieldLabel>E-mail</FieldLabel>
                            <FieldInput
                                placeholder="pracownik@firma.pl"
                                value={values.email}
                                onChange={e => set('email', e.target.value)}
                                $error={!!errors.email}
                            />
                            {errors.email && <ErrorMsg>{errors.email}</ErrorMsg>}
                        </FormField>
                    </FormGrid>

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
                                <>
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
                                    <FormField>
                                        <FieldLabel>Rola (uprawnienia)</FieldLabel>
                                        <FieldSelect
                                            value={values.rbacRoleId}
                                            onChange={e => set('rbacRoleId', e.target.value)}
                                        >
                                            <option value="">Brak roli</option>
                                            {roles.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </FieldSelect>
                                        <HintText>Określa szczegółowe uprawnienia w systemie.</HintText>
                                    </FormField>
                                </>
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
