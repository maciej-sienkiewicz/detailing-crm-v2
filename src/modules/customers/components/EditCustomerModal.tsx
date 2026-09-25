// src/modules/customers/components/EditCustomerModal.tsx
//
// Edycja danych klienta: osoba i kontakt, adres zamieszkania, firma.
//
// Okno miało trzy zakładki i jeden „Zapisz", który wysyłał WYŁĄCZNIE formularz
// z otwartej zakładki. Skutki były dwa i oba ciche:
//  - zmiany wpisane w dwóch zakładkach zapisywały się w połowie - to, co zostało
//    w drugiej zakładce, przepadało bez słowa;
//  - błąd walidacji w ukrytej zakładce (np. ulica bez kodu pocztowego) blokował
//    zapis, a użytkownik widział tylko, że „Zapisz" nic nie robi.
// Teraz grupy stoją jedna pod drugą (jak w edycji pojazdu), a „Zapisz zmiany"
// wysyła każdą część, którą ktoś faktycznie zmienił. `initialTab` zostaje
// w propsach - przewija okno do wskazanej grupy, więc „Edytuj" przy panelu firmy
// dalej otwiera okno od razu na firmie.

import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import styled from 'styled-components';
import { useForm, FormProvider, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { useUpdateCustomer } from '../hooks/useUpdateCustomer';
import { useUpdateCompany } from '../hooks/useUpdateCompany';
import { useDeleteCompany } from '../hooks/useDeleteCompany';
import { createCustomerSchema, type CreateCustomerFormData } from '../utils/customerValidation';
import { validatePolishNip, validatePolishRegon } from '../utils/polishValidators';
import { NipInputWithGus } from '@/common/components/NipInputWithGus';
import type { CompanyInfoResponse } from '@/common/components/NipInputWithGus';
import { t } from '@/common/i18n';
import type { CompanyDetails, Customer, UpdateCompanyPayload, UpdateCustomerPayload } from '../types';
import { PhoneInputField } from '@/common/components/PhoneInputField';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import {
    FormGrid,
    FormField,
    FieldLabel,
    InputShell,
    BareInput,
    FormErrorMsg,
} from '@/common/components/Form';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Button, ui } from '@/common/components/ui';

const companySchema = z.object({
    name: z.string().min(2, t.customers.validation.companyNameMin),
    nip: z
        .string()
        .transform(val => val.replace(/[\s-]/g, ''))
        .refine(validatePolishNip, t.customers.validation.nipInvalid),
    regon: z
        .string()
        .transform(val => val.replace(/[\s-]/g, ''))
        .refine(validatePolishRegon, t.customers.validation.regonInvalid),
    street: z.string().min(1, t.customers.validation.streetRequired),
    city: z.string().min(1, t.customers.validation.cityRequired),
    postalCode: z.string().regex(/^\d{2}-\d{3}$/, t.customers.validation.postalCodeInvalid),
    country: z.string().min(1, t.customers.validation.countryRequired),
});

type CompanyFormData = z.infer<typeof companySchema>;

type TabId = 'basic' | 'address' | 'company';

interface EditCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
    /** Grupa, do której okno przewija się po otwarciu (dawniej: otwarta zakładka). */
    initialTab?: TabId;
}

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 22px;
`;

const Group = styled.section`
    min-width: 0;
    scroll-margin-top: 8px;

    & + & { padding-top: 20px; border-top: 1px solid ${ui.lineFaint}; }
`;

const GroupHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    min-height: 30px;
`;

const GroupTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: ${ui.ink};
`;

const GroupHint = styled.p`
    margin: -6px 0 12px;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

const NoCompany = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px 14px;
    border: 1px dashed ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surfaceSoft};
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.textSecondary};
`;

const capReg = <N extends string>(reg: UseFormRegisterReturn<N>): UseFormRegisterReturn<N> => ({
    ...reg,
    onChange: e => {
        e.target.value = capitalizeFirst(e.target.value);
        return reg.onChange(e);
    },
});

const customerDefaults = (customer: Customer): CreateCustomerFormData => ({
    firstName: customer.firstName ?? '',
    lastName: customer.lastName ?? '',
    email: customer.contact.email ?? '',
    phone: customer.contact.phone ?? '',
    // Puste teksty zamiast `null`: przy `null` pola adresu startują jako `undefined`
    // i po wpisaniu samej ulicy zod odpowiadał angielskim „Required" zamiast
    // polskiego komunikatu. Adres bez ulicy i tak odpada w resolverze i w payloadzie.
    homeAddress: customer.homeAddress ?? { street: '', city: '', postalCode: '', country: '' },
    company: null,
});

// Firma z API bywa niepełna (panel w karcie klienta pokazuje NIP, REGON i adres
// warunkowo), więc brakujące pole ląduje w formularzu jako pusty tekst, a nie
// wywraca okna na `undefined.street`.
const companyDefaults = (company: CompanyDetails | null): CompanyFormData => company ? {
    name: company.name ?? '',
    nip: company.nip ?? '',
    regon: company.regon ?? '',
    street: company.address?.street ?? '',
    city: company.address?.city ?? '',
    postalCode: company.address?.postalCode ?? '',
    country: company.address?.country ?? '',
} : { name: '', nip: '', regon: '', street: '', city: '', postalCode: '', country: 'Polska' };

const toCustomerPayload = (data: CreateCustomerFormData): UpdateCustomerPayload => {
    const hasAddress = !!(data.homeAddress?.street?.trim());
    return {
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        contact: {
            email: data.email ?? null,
            phone: data.phone ?? null,
        },
        homeAddress: hasAddress ? (data.homeAddress ?? null) : null,
    };
};

const toCompanyPayload = (data: CompanyFormData): UpdateCompanyPayload => ({
    name: data.name,
    nip: data.nip,
    regon: data.regon,
    address: {
        street: data.street,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
    },
});

// Przewija treść okna, nie dokument: `scrollIntoView` przewija KAŻDEGO przodka,
// łącznie ze stroną pod zablokowanym tłem (CLAUDE.md §3).
const scrollToGroup = (content: HTMLElement | null, group: HTMLElement | null, smooth: boolean) => {
    if (!content || !group) return;
    const top = group.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop - 8;
    if (typeof content.scrollTo === 'function') {
        content.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
    } else {
        content.scrollTop = Math.max(0, top);
    }
};

export const EditCustomerModal = ({ isOpen, ...rest }: EditCustomerModalProps) =>
    // Treść montuje się od nowa przy każdym otwarciu i bierze wartości z `customer`
    // z tej chwili. Wcześniej efekt resetował oba formularze przy KAŻDEJ zmianie
    // `customer` - a ta zmienia się sama, gdy zapis jednej części odświeży kartę
    // klienta. Nieudany zapis drugiej części kasował wtedy to, co właśnie wpisano.
    isOpen ? <EditCustomerDialog {...rest} /> : null;

type DialogProps = Omit<EditCustomerModalProps, 'isOpen'>;

function EditCustomerDialog({ onClose, customer, initialTab }: DialogProps) {
    const { showSuccess, showError } = useToast();
    const hasCompany = !!customer.company;
    // Klient bez firmy nie dostaje od razu siedmiu pustych, wymaganych pól: ich
    // walidacja blokowałaby zapis samego telefonu. Formularz firmy pokazuje się
    // dopiero po „Dodaj dane firmy".
    const [addingCompany, setAddingCompany] = useState(!hasCompany && initialTab === 'company');
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [saving, setSaving] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);
    const basicRef = useRef<HTMLElement>(null);
    const addressRef = useRef<HTMLElement>(null);
    const companyRef = useRef<HTMLElement>(null);
    const groupRef = (tab: TabId): RefObject<HTMLElement | null> =>
        tab === 'company' ? companyRef : tab === 'address' ? addressRef : basicRef;

    const methods = useForm<CreateCustomerFormData>({
        resolver: (values, context, options) => {
            const hasAddress = !!(values.homeAddress?.street?.trim());
            const dataToValidate = {
                ...values,
                homeAddress: hasAddress ? values.homeAddress : null,
                company: null,
            };
            return zodResolver(createCustomerSchema)(dataToValidate, context, options);
        },
        defaultValues: customerDefaults(customer),
    });

    const companyMethods = useForm<CompanyFormData>({
        resolver: zodResolver(companySchema),
        defaultValues: companyDefaults(customer.company),
    });

    // Odczyt w renderze subskrybuje `isDirty` - bez tego RHF go nie liczy,
    // a zapis poniżej opiera się na nim.
    const customerDirty = methods.formState.isDirty;
    const companyDirty = companyMethods.formState.isDirty;
    const showCompanyForm = hasCompany || addingCompany;

    // Okno montuje się przy każdym otwarciu, więc ten efekt działa raz na otwarcie.
    useEffect(() => {
        if (!initialTab || initialTab === 'basic') return;
        const target = initialTab === 'address' ? addressRef : companyRef;
        // Klatka później: ModalShell renderuje przez portal i treść musi już mieć wymiary.
        const frame = requestAnimationFrame(() => scrollToGroup(contentRef.current, target.current, false));
        return () => cancelAnimationFrame(frame);
    }, [initialTab]);

    const { updateCustomer } = useUpdateCustomer({ customerId: customer.id });
    const { updateCompany } = useUpdateCompany({ customerId: customer.id });
    const { deleteCompany, isDeleting } = useDeleteCompany({
        customerId: customer.id,
        onSuccess: () => {
            showSuccess('Firma usunięta', 'Klient zostaje w bazie jako osoba prywatna.');
            onClose();
        },
        // Wcześniej nieudane usunięcie nie mówiło nic - przycisk wracał do „Usuń firmę".
        onError: () => showError('Nie udało się usunąć firmy', 'Spróbuj ponownie za chwilę.'),
    });

    const saveCustomer = (payload: UpdateCustomerPayload) => new Promise<boolean>(resolve => {
        updateCustomer(payload, { onSuccess: () => resolve(true), onError: () => resolve(false) });
    });
    const saveCompany = (payload: UpdateCompanyPayload) => new Promise<boolean>(resolve => {
        updateCompany(payload, { onSuccess: () => resolve(true), onError: () => resolve(false) });
    });

    const handleGusData = (data: CompanyInfoResponse) => {
        // `shouldDirty`: dane z GUS to zmiana jak każda inna - bez tego zapis uznałby,
        // że w firmie nic się nie zmieniło, i pominął ją.
        const opts = { shouldValidate: true, shouldDirty: true };
        companyMethods.setValue('name', data.name, opts);
        companyMethods.setValue('regon', data.regon, opts);
        const { street, buildingNumber, apartmentNumber, city, postalCode, country } = data.address;
        const streetLine = [street, buildingNumber].filter(Boolean).join(' ') +
            (apartmentNumber ? `/${apartmentNumber}` : '');
        const formattedPostal = postalCode?.replace(/^(\d{2})(\d{3})$/, '$1-$2') ?? postalCode ?? '';
        companyMethods.setValue('street', streetLine || '', opts);
        companyMethods.setValue('city', city ?? '', opts);
        companyMethods.setValue('postalCode', formattedPostal, opts);
        companyMethods.setValue('country', country ?? 'Polska', opts);
    };

    const cancelAddingCompany = () => {
        setAddingCompany(false);
        companyMethods.reset(companyDefaults(null));
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (saving) return;

        // Wysyłamy tylko to, co ktoś zmienił. Firmy, której nikt nie ruszał, nie
        // walidujemy: starsze firmy bywają bez REGON-u, a jego brak nie może
        // blokować poprawienia numeru telefonu.
        const withCustomer = customerDirty;
        const withCompany = hasCompany ? companyDirty : addingCompany;
        if (!withCustomer && !withCompany) {
            onClose();
            return;
        }

        setSaving(true);
        const valid: { customer?: CreateCustomerFormData; company?: CompanyFormData } = {};
        const invalid: { first?: TabId } = {};

        // Firma najpierw, osoba potem: każdy handleSubmit stawia fokus na pierwszym
        // błędnym polu SWOJEGO formularza, więc ostatnie słowo ma ten, który stoi
        // w oknie wyżej.
        if (withCompany) {
            await companyMethods.handleSubmit(
                data => { valid.company = data; },
                () => { invalid.first = 'company'; },
            )();
        }
        if (withCustomer) {
            await methods.handleSubmit(
                data => { valid.customer = data; },
                errors => {
                    const basic = errors.firstName || errors.lastName || errors.email || errors.phone;
                    invalid.first = basic ? 'basic' : 'address';
                },
            )();
        }

        if (invalid.first) {
            // Nic nie wysyłamy, dopóki któraś część ma błąd - pół zapisu jest gorsze
            // niż żaden, bo użytkownik nie wie, która połowa weszła.
            setSaving(false);
            scrollToGroup(contentRef.current, groupRef(invalid.first).current, true);
            return;
        }

        const [customerOk, companyOk] = await Promise.all([
            valid.customer ? saveCustomer(toCustomerPayload(valid.customer)) : Promise.resolve(true),
            valid.company ? saveCompany(toCompanyPayload(valid.company)) : Promise.resolve(true),
        ]);
        setSaving(false);

        if (customerOk && companyOk) {
            showSuccess('Dane klienta zapisane', 'Zmiany widać już w karcie klienta.');
            onClose();
            return;
        }

        // Część, która weszła, jest już na serwerze - oznaczamy ją jako zapisaną,
        // żeby ponowienie wysłało tylko resztę. Okno zostaje otwarte z tym, co wpisano.
        if (valid.customer && customerOk) methods.reset(methods.getValues());
        if (valid.company && companyOk) companyMethods.reset(companyMethods.getValues());

        if (!customerOk && !companyOk) {
            showError('Nie udało się zapisać zmian', 'Spróbuj ponownie za chwilę.');
        } else if (!companyOk) {
            showError(
                'Nie udało się zapisać danych firmy',
                valid.customer ? 'Dane osoby zapisały się. Spróbuj ponownie zapisać firmę.' : 'Spróbuj ponownie za chwilę.',
            );
        } else {
            showError(
                'Nie udało się zapisać danych klienta',
                valid.company ? 'Dane firmy zapisały się. Spróbuj ponownie zapisać resztę.' : 'Spróbuj ponownie za chwilę.',
            );
        }
    };

    const close = () => {
        if (saving) return;
        onClose();
    };

    const errors = methods.formState.errors;
    const companyErrors = companyMethods.formState.errors;
    const busy = saving || isDeleting;

    return (
        // Escape i klik w tło nie zamykają okna, gdy stoi nad nim potwierdzenie
        // usunięcia firmy - inaczej jeden Escape zamykałby oba okna i gubił edycję.
        <ModalShell isOpen onClose={close} size="lg" dismissible={!confirmingDelete}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Edytuj dane klienta</ModalTitle>
                    <ModalSubtitle>Osoba i kontakt, adres zamieszkania, firma</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={close} />
            </ModalHeader>

            <ModalContent ref={contentRef}>
                <Form id="edit-customer-form" onSubmit={submit} autoComplete="off" noValidate>
                    <FormProvider {...methods}>
                        <Group ref={basicRef} aria-labelledby="ec-group-basic">
                            <GroupHead>
                                <GroupTitle id="ec-group-basic">Osoba i kontakt</GroupTitle>
                            </GroupHead>
                            <FormGrid>
                                <FormField>
                                    <FieldLabel htmlFor="edit-firstName">
                                        {t.customers.form.firstName}
                                    </FieldLabel>
                                    <InputShell $hasError={!!errors.firstName}>
                                        <BareInput
                                            id="edit-firstName"
                                            autoComplete="new-password"
                                            {...capReg(methods.register('firstName'))}
                                            placeholder={t.customers.form.firstNamePlaceholder}
                                        />
                                    </InputShell>
                                    {errors.firstName && <FormErrorMsg>{errors.firstName.message}</FormErrorMsg>}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="edit-lastName">
                                        {t.customers.form.lastName}
                                    </FieldLabel>
                                    <InputShell $hasError={!!errors.lastName}>
                                        <BareInput
                                            id="edit-lastName"
                                            autoComplete="new-password"
                                            {...capReg(methods.register('lastName'))}
                                            placeholder={t.customers.form.lastNamePlaceholder}
                                        />
                                    </InputShell>
                                    {errors.lastName && <FormErrorMsg>{errors.lastName.message}</FormErrorMsg>}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="edit-email">
                                        {t.customers.form.email}
                                    </FieldLabel>
                                    <InputShell $hasError={!!errors.email}>
                                        <BareInput
                                            id="edit-email"
                                            type="email"
                                            autoComplete="new-password"
                                            {...methods.register('email')}
                                            placeholder={t.customers.form.emailPlaceholder}
                                        />
                                    </InputShell>
                                    {errors.email && <FormErrorMsg>{errors.email.message}</FormErrorMsg>}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="edit-phone">
                                        {t.customers.form.phone}
                                    </FieldLabel>
                                    <PhoneInputField
                                        name="phone"
                                        id="edit-phone"
                                        placeholder={t.customers.form.phonePlaceholder}
                                    />
                                </FormField>
                            </FormGrid>
                        </Group>

                        <Group ref={addressRef} aria-labelledby="ec-group-address">
                            <GroupHead>
                                <GroupTitle id="ec-group-address">Adres zamieszkania</GroupTitle>
                            </GroupHead>
                            {/* Resolver pomija adres bez ulicy - lepiej to powiedzieć, niż
                                pozwolić wpisać samo miasto i patrzeć, jak znika po zapisie. */}
                            <GroupHint>Adres zapisuje się razem z ulicą. Zostaw ulicę pustą, jeśli klient nie podał adresu.</GroupHint>
                            <FormGrid>
                                <FormField $fullWidth>
                                    <FieldLabel htmlFor="edit-homeAddress.street">
                                        {t.customers.form.homeAddress.street}
                                    </FieldLabel>
                                    <InputShell $hasError={!!errors.homeAddress?.street}>
                                        <BareInput
                                            id="edit-homeAddress.street"
                                            autoComplete="new-password"
                                            {...methods.register('homeAddress.street')}
                                            placeholder={t.customers.form.homeAddress.streetPlaceholder}
                                        />
                                    </InputShell>
                                    {errors.homeAddress?.street && (
                                        <FormErrorMsg>{errors.homeAddress.street.message}</FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="edit-homeAddress.city">
                                        {t.customers.form.homeAddress.city}
                                    </FieldLabel>
                                    <InputShell $hasError={!!errors.homeAddress?.city}>
                                        <BareInput
                                            id="edit-homeAddress.city"
                                            autoComplete="new-password"
                                            {...methods.register('homeAddress.city')}
                                            placeholder={t.customers.form.homeAddress.cityPlaceholder}
                                        />
                                    </InputShell>
                                    {errors.homeAddress?.city && (
                                        <FormErrorMsg>{errors.homeAddress.city.message}</FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="edit-homeAddress.postalCode">
                                        {t.customers.form.homeAddress.postalCode}
                                    </FieldLabel>
                                    <InputShell $hasError={!!errors.homeAddress?.postalCode}>
                                        <BareInput
                                            id="edit-homeAddress.postalCode"
                                            autoComplete="new-password"
                                            {...methods.register('homeAddress.postalCode')}
                                            placeholder={t.customers.form.homeAddress.postalCodePlaceholder}
                                        />
                                    </InputShell>
                                    {errors.homeAddress?.postalCode && (
                                        <FormErrorMsg>{errors.homeAddress.postalCode.message}</FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="edit-homeAddress.country">
                                        {t.customers.form.homeAddress.country}
                                    </FieldLabel>
                                    <InputShell $hasError={!!errors.homeAddress?.country}>
                                        <BareInput
                                            id="edit-homeAddress.country"
                                            autoComplete="new-password"
                                            {...methods.register('homeAddress.country')}
                                            placeholder={t.customers.form.homeAddress.countryPlaceholder}
                                        />
                                    </InputShell>
                                    {errors.homeAddress?.country && (
                                        <FormErrorMsg>{errors.homeAddress.country.message}</FormErrorMsg>
                                    )}
                                </FormField>
                            </FormGrid>
                        </Group>
                    </FormProvider>

                    <Group ref={companyRef} aria-labelledby="ec-group-company">
                        <GroupHead>
                            <GroupTitle id="ec-group-company">Firma</GroupTitle>
                            {hasCompany && (
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => setConfirmingDelete(true)}
                                    disabled={busy}
                                >
                                    <Trash2 aria-hidden="true" />
                                    {isDeleting ? 'Usuwanie...' : 'Usuń firmę'}
                                </Button>
                            )}
                            {!hasCompany && addingCompany && (
                                <Button variant="ghost" size="sm" onClick={cancelAddingCompany} disabled={busy}>
                                    Nie dodawaj firmy
                                </Button>
                            )}
                        </GroupHead>

                        {!showCompanyForm ? (
                            <NoCompany>
                                <span>Klient nie ma przypisanej firmy.</span>
                                <Button variant="tinted" size="sm" onClick={() => setAddingCompany(true)} disabled={busy}>
                                    <Plus aria-hidden="true" />
                                    Dodaj dane firmy
                                </Button>
                            </NoCompany>
                        ) : (
                            <FormGrid>
                                <FormField $fullWidth>
                                    <FieldLabel htmlFor="ec-company-name">
                                        {t.customers.form.company.name}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyErrors.name}>
                                        <BareInput
                                            id="ec-company-name"
                                            autoComplete="off"
                                            {...capReg(companyMethods.register('name'))}
                                            placeholder={t.customers.form.company.namePlaceholder}
                                        />
                                    </InputShell>
                                    {companyErrors.name && <FormErrorMsg>{companyErrors.name.message}</FormErrorMsg>}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="ec-company-nip">
                                        {t.customers.form.company.nip}
                                    </FieldLabel>
                                    <NipInputWithGus
                                        id="ec-company-nip"
                                        value={companyMethods.watch('nip') ?? ''}
                                        onChange={val => companyMethods.setValue('nip', val, {
                                            shouldValidate: companyMethods.formState.isSubmitted,
                                            shouldDirty: true,
                                        })}
                                        onFetch={handleGusData}
                                        hasError={!!companyErrors.nip}
                                        placeholder={t.customers.form.company.nipPlaceholder}
                                    />
                                    {companyErrors.nip && <FormErrorMsg>{companyErrors.nip.message}</FormErrorMsg>}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="ec-company-regon">
                                        {t.customers.form.company.regon}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyErrors.regon}>
                                        <BareInput
                                            id="ec-company-regon"
                                            autoComplete="off"
                                            {...companyMethods.register('regon')}
                                            placeholder={t.customers.form.company.regonPlaceholder}
                                        />
                                    </InputShell>
                                    {companyErrors.regon && <FormErrorMsg>{companyErrors.regon.message}</FormErrorMsg>}
                                </FormField>

                                <FormField $fullWidth>
                                    <FieldLabel htmlFor="ec-company-street">
                                        {t.customers.form.company.street}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyErrors.street}>
                                        <BareInput
                                            id="ec-company-street"
                                            autoComplete="off"
                                            {...companyMethods.register('street')}
                                            placeholder={t.customers.form.company.streetPlaceholder}
                                        />
                                    </InputShell>
                                    {companyErrors.street && <FormErrorMsg>{companyErrors.street.message}</FormErrorMsg>}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="ec-company-city">
                                        {t.customers.form.company.city}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyErrors.city}>
                                        <BareInput
                                            id="ec-company-city"
                                            autoComplete="off"
                                            {...companyMethods.register('city')}
                                            placeholder={t.customers.form.company.cityPlaceholder}
                                        />
                                    </InputShell>
                                    {companyErrors.city && <FormErrorMsg>{companyErrors.city.message}</FormErrorMsg>}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="ec-company-postalCode">
                                        {t.customers.form.company.postalCode}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyErrors.postalCode}>
                                        <BareInput
                                            id="ec-company-postalCode"
                                            autoComplete="off"
                                            {...companyMethods.register('postalCode')}
                                            placeholder={t.customers.form.company.postalCodePlaceholder}
                                        />
                                    </InputShell>
                                    {companyErrors.postalCode && (
                                        <FormErrorMsg>{companyErrors.postalCode.message}</FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="ec-company-country">
                                        {t.customers.form.company.country}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyErrors.country}>
                                        <BareInput
                                            id="ec-company-country"
                                            autoComplete="off"
                                            {...companyMethods.register('country')}
                                            placeholder={t.customers.form.company.countryPlaceholder}
                                        />
                                    </InputShell>
                                    {companyErrors.country && <FormErrorMsg>{companyErrors.country.message}</FormErrorMsg>}
                                </FormField>
                            </FormGrid>
                        )}
                    </Group>
                </Form>
            </ModalContent>

            <ModalFooter>
                <Button onClick={close} disabled={saving}>Anuluj</Button>
                <Button type="submit" form="edit-customer-form" variant="primary" disabled={busy}>
                    {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </Button>
            </ModalFooter>

            <ConfirmationModal
                isOpen={confirmingDelete}
                title="Usunąć firmę klienta?"
                message={customerDirty
                    ? 'Klient zostanie w bazie jako osoba prywatna. Niezapisane zmiany w pozostałych polach przepadną, bo okno zamknie się po usunięciu.'
                    : 'Klient zostanie w bazie jako osoba prywatna. Dane firmy znikną z jego karty.'}
                variant="danger"
                confirmText="Usuń firmę"
                cancelText="Zostaw"
                onConfirm={() => {
                    setConfirmingDelete(false);
                    deleteCompany();
                }}
                onCancel={() => setConfirmingDelete(false)}
            />
        </ModalShell>
    );
}
