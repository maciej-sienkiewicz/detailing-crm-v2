import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Button } from '@/common/components/ui';
import {
    FormGrid, FormField, FieldLabel, FieldInput, ErrorMsg, HintText, CheckRow, CheckBox,
} from '../rbacShared.styles';
import { useSettingsDirty } from '../shared/settingsChrome';
import { RolePicker } from './RolePicker';
import { RoleEditorModal } from '../roles/RoleEditorModal';
import { usePermissionCatalog, useCreateRole } from '../../hooks/useRoles';
import { reportMutationError } from './mutationError';
import type { UpdateEmployeeRequest, CreateEmployeeFormOutput } from '../../teamTypes';
import type { Role, CreateRoleRequest } from '../../rbacTypes';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

interface FormValues {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    createAccount: boolean;
    roleId: string;
}

/** Tyle z pracownika, ile formularz edytuje - wystarcza wiersz listy, bez osobnego żądania. */
export interface EmployeeFormSubject {
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    hasAccount: boolean;
}

/** Konto zakładane przy okazji edycji („Zaproś do systemu"). */
export interface AccountInvite {
    email: string;
    roleId: string | null;
}

type Errors = Partial<Record<keyof FormValues, string>>;

const orNull = (v: string): string | null => {
    const t = v.trim();
    return t === '' ? null : t;
};

interface CommonProps {
    roles?: Role[];
    isSaving: boolean;
    onClose: () => void;
}

/**
 * Dwa tryby jako dwa kształty propsów, a nie dwa opcjonalne callbacki: lista
 * przekazywała `onSubmitUpdate={() => {}}`, więc tryb edycji istniał, ale zapis
 * w nim niczego nie robił - i TypeScript nie miał jak tego wychwycić.
 */
export type EmployeeFormModalProps = CommonProps & (
    | { mode: 'add'; onSubmitCreate: (data: CreateEmployeeFormOutput) => void }
    | {
        mode: 'edit';
        employee: EmployeeFormSubject;
        /**
         * `payload` jest null, gdy dane osobowe się nie zmieniły (samo zaproszenie);
         * `invite` - gdy osoba bez konta ma je dostać.
         */
        onSubmitUpdate: (payload: UpdateEmployeeRequest | null, invite: AccountInvite | null) => void;
        /** Otwarte z „Zaproś do systemu": część o koncie od razu zaznaczona i na wierzchu. */
        focusAccount?: boolean;
    }
);

export function EmployeeFormModal(props: EmployeeFormModalProps) {
    const { mode, roles = [], isSaving, onClose } = props;
    const employee = props.mode === 'edit' ? props.employee : null;
    const focusAccount = props.mode === 'edit' && !!props.focusAccount && !props.employee.hasAccount;

    const [initial] = useState<FormValues>(() => ({
        firstName: employee?.firstName ?? '',
        lastName: employee?.lastName ?? '',
        phone: employee?.phone ?? '',
        email: employee?.email ?? '',
        createAccount: false,
        roleId: '',
    }));
    const [values, setValues] = useState<FormValues>(() => ({ ...initial, createAccount: focusAccount }));
    const [errors, setErrors] = useState<Errors>({});
    const [roleEditorOpen, setRoleEditorOpen] = useState(false);
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const accountRef = useRef<HTMLButtonElement>(null);

    const { showError } = useToast();
    const { catalog, isLoading: catalogLoading } = usePermissionCatalog();
    const createRole = useCreateRole();

    // Konto można założyć przy dodawaniu i u osoby, która go jeszcze nie ma.
    const canInvite = mode === 'add' || (employee !== null && !employee.hasAccount);

    const personalChanged = (['firstName', 'lastName', 'phone', 'email'] as const)
        .some(key => values[key].trim() !== initial[key].trim());
    const dirty = personalChanged || values.createAccount !== initial.createAccount || values.roleId !== '';

    // Przejście do innej sekcji ustawień pyta, zamiast wyrzucić wpisanego pracownika.
    useSettingsDirty(dirty);

    useEffect(() => {
        if (!focusAccount) return;
        // Fokus sam przewija okno do części o koncie - to ona jest powodem otwarcia.
        accountRef.current?.focus();
    }, [focusAccount]);

    const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
        setValues(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const requestClose = () => {
        if (isSaving) return;
        if (dirty) setConfirmDiscard(true);
        else onClose();
    };

    // A role built here is selected straight away: the point of the inline editor is
    // that the half-filled employee form survives the detour.
    const handleCreateRole = (payload: CreateRoleRequest) => {
        createRole.mutate(payload, {
            onSuccess: ({ roleId }) => {
                set('roleId', roleId);
                setRoleEditorOpen(false);
            },
            // Edytor zostaje otwarty z zaznaczonymi uprawnieniami - użytkownik może poprawić
            // nazwę (najczęściej: rola o tej nazwie już istnieje) i zapisać jeszcze raz.
            onError: error => reportMutationError(showError, 'Nie udało się dodać roli', error),
        });
    };

    const validate = (): Errors => {
        const e: Errors = {};
        if (!values.firstName.trim()) e.firstName = 'Imię jest wymagane';
        if (!values.lastName.trim()) e.lastName = 'Nazwisko jest wymagane';
        if (canInvite && values.createAccount) {
            if (!values.email.trim()) e.email = 'Adres e-mail jest wymagany do utworzenia konta';
            else if (!isEmail(values.email)) e.email = 'Nieprawidłowy adres e-mail';
        } else if (values.email.trim() && !isEmail(values.email)) {
            e.email = 'Nieprawidłowy adres e-mail';
        }
        return e;
    };

    const handleSubmit = () => {
        const e = validate();
        if (Object.keys(e).length > 0) { setErrors(e); return; }

        const personal = {
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            phone: orNull(values.phone),
            email: orNull(values.email),
        };

        if (props.mode === 'add') {
            props.onSubmitCreate({
                ...personal,
                createAccount: values.createAccount,
                roleId: values.roleId || null,
            });
            return;
        }

        const invite = canInvite && values.createAccount
            ? { email: values.email.trim(), roleId: values.roleId || null }
            : null;
        if (!personalChanged && !invite) { onClose(); return; }
        props.onSubmitUpdate(personalChanged ? personal : null, invite);
    };

    const submitLabel = mode === 'add'
        ? 'Dodaj pracownika'
        : values.createAccount && canInvite ? 'Zapisz i wyślij zaproszenie' : 'Zapisz zmiany';

    return (
        <>
            <ModalShell
                isOpen
                onClose={requestClose}
                size="md"
                // Okno nad tym (edytor roli, pytanie o porzucenie) ma własny Escape.
                // Bez tego jeden Escape zamykał oba okna - z wpisanym pracownikiem.
                dismissible={!roleEditorOpen && !confirmDiscard}
            >
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>{mode === 'add' ? 'Nowy pracownik' : 'Edytuj pracownika'}</ModalTitle>
                        <ModalSubtitle>
                            {mode === 'add'
                                ? 'Konto w systemie jest opcjonalne. Pracownika bez konta możesz zaprosić później.'
                                : focusAccount
                                    ? 'Sprawdź adres e-mail i wybierz rolę - zaproszenie trafi na ten adres.'
                                    : 'Dane kontaktowe pracownika.'}
                        </ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={requestClose} />
                </ModalHeader>

                <ModalContent>
                    <FormGrid>
                        <FormField>
                            <FieldLabel htmlFor="employee-first-name">Imię<span>*</span></FieldLabel>
                            <FieldInput
                                id="employee-first-name"
                                value={values.firstName}
                                onChange={e => set('firstName', capitalizeFirst(e.target.value))}
                                $error={!!errors.firstName}
                                autoFocus={!focusAccount}
                            />
                            {errors.firstName && <ErrorMsg role="alert">{errors.firstName}</ErrorMsg>}
                        </FormField>
                        <FormField>
                            <FieldLabel htmlFor="employee-last-name">Nazwisko<span>*</span></FieldLabel>
                            <FieldInput
                                id="employee-last-name"
                                value={values.lastName}
                                onChange={e => set('lastName', capitalizeFirst(e.target.value))}
                                $error={!!errors.lastName}
                            />
                            {errors.lastName && <ErrorMsg role="alert">{errors.lastName}</ErrorMsg>}
                        </FormField>
                    </FormGrid>

                    <FormGrid>
                        <FormField>
                            <FieldLabel htmlFor="employee-phone">Telefon</FieldLabel>
                            <FieldInput
                                id="employee-phone"
                                type="tel"
                                placeholder="+48 600 000 000"
                                value={values.phone}
                                onChange={e => set('phone', e.target.value)}
                            />
                        </FormField>
                        <FormField>
                            <FieldLabel htmlFor="employee-email">E-mail</FieldLabel>
                            <FieldInput
                                id="employee-email"
                                type="email"
                                placeholder="pracownik@firma.pl"
                                value={values.email}
                                onChange={e => set('email', e.target.value)}
                                $error={!!errors.email}
                            />
                            {errors.email && <ErrorMsg role="alert">{errors.email}</ErrorMsg>}
                        </FormField>
                    </FormGrid>

                    {canInvite && (
                        <AccountBox>
                            {/* Przycisk z rolą pola wyboru: `div` z onClick nie przyjmował
                                fokusu, więc konta nie dało się włączyć klawiaturą. */}
                            <CheckRow
                                as="button"
                                type="button"
                                ref={accountRef}
                                role="checkbox"
                                aria-checked={values.createAccount}
                                onClick={() => set('createAccount', !values.createAccount)}
                            >
                                <CheckBox $checked={values.createAccount} aria-hidden="true">
                                    {values.createAccount && <TinyCheck />}
                                </CheckBox>
                                <AccountTexts>
                                    <AccountBoxTitle>
                                        {mode === 'add' ? 'Utwórz konto użytkownika' : 'Zaproś do systemu'}
                                    </AccountBoxTitle>
                                    <HintText>
                                        Zaproszenie z linkiem do ustawienia hasła trafi na adres e-mail podany wyżej. Link jest ważny 48 godzin.
                                    </HintText>
                                </AccountTexts>
                            </CheckRow>

                            {values.createAccount && (
                                <FormField style={{ marginTop: 14 }}>
                                    <FieldLabel as="span">Rola i uprawnienia</FieldLabel>
                                    <RolePicker
                                        roles={roles}
                                        value={values.roleId}
                                        onChange={roleId => set('roleId', roleId)}
                                        onOpenFullEditor={() => setRoleEditorOpen(true)}
                                        disabled={isSaving}
                                    />
                                </FormField>
                            )}
                        </AccountBox>
                    )}
                </ModalContent>

                <ModalFooter>
                    <Button variant="outline" onClick={requestClose} disabled={isSaving}>Anuluj</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Zapisywanie...' : submitLabel}
                    </Button>
                </ModalFooter>
            </ModalShell>

            {roleEditorOpen && (
                <RoleEditorModal
                    mode="add"
                    role={null}
                    catalog={catalog}
                    catalogLoading={catalogLoading}
                    isSaving={createRole.isPending}
                    onClose={() => setRoleEditorOpen(false)}
                    onSubmit={handleCreateRole}
                    nested
                />
            )}

            <ConfirmationModal
                isOpen={confirmDiscard}
                title="Odrzucić wpisane dane?"
                message="Zmiany w formularzu pracownika nie zostały zapisane."
                variant="warning"
                confirmText="Odrzuć zmiany"
                cancelText="Wróć do formularza"
                onConfirm={() => { setConfirmDiscard(false); onClose(); }}
                onCancel={() => setConfirmDiscard(false)}
            />
        </>
    );
}

// ─── Local styled + icons ─────────────────────────────────────────────────────
const AccountBox = styled.div`
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #f8fafc;
`;

const AccountTexts = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const AccountBoxTitle = styled.span`
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
`;

const TinyCheck = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
