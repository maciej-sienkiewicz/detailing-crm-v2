import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateCustomer } from '../hooks/useUpdateCustomer';
import { useUpdateCompany } from '../hooks/useUpdateCompany';
import { useDeleteCompany } from '../hooks/useDeleteCompany';
import { createCustomerSchema, type CreateCustomerFormData } from '../utils/customerValidation';
import { validatePolishNip, validatePolishRegon } from '../utils/polishValidators';
import { NipInputWithGus } from '@/common/components/NipInputWithGus';
import type { CompanyInfoResponse } from '@/common/components/NipInputWithGus';
import { t } from '@/common/i18n';
import type { Customer } from '../types';
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
import { SharedButton } from '@/common/styles';
import {
    FormGrid,
    FormField,
    FieldLabel,
    InputShell,
    BareInput,
    FormErrorMsg,
    FormAlertBanner,
    FormTabBar,
    FormTabBtn,
    FormTabPanel,
} from '@/common/components/Form';

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
    initialTab?: TabId;
}

export const EditCustomerModal = ({ isOpen, onClose, customer, initialTab }: EditCustomerModalProps) => {
    const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? 'basic');

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
        defaultValues: {
            firstName: customer.firstName ?? '',
            lastName: customer.lastName ?? '',
            email: customer.contact.email ?? '',
            phone: customer.contact.phone ?? '',
            homeAddress: customer.homeAddress ?? null,
            company: null,
            notes: '',
        },
    });

    const companyMethods = useForm<CompanyFormData>({
        resolver: zodResolver(companySchema),
        defaultValues: customer.company ? {
            name: customer.company.name,
            nip: customer.company.nip,
            regon: customer.company.regon,
            street: customer.company.address.street,
            city: customer.company.address.city,
            postalCode: customer.company.address.postalCode,
            country: customer.company.address.country,
        } : { name: '', nip: '', regon: '', street: '', city: '', postalCode: '', country: 'Polska' },
    });

    useEffect(() => {
        if (isOpen && customer) {
            setActiveTab(initialTab ?? 'basic');
            methods.reset({
                firstName: customer.firstName ?? '',
                lastName: customer.lastName ?? '',
                email: customer.contact.email ?? '',
                phone: customer.contact.phone ?? '',
                homeAddress: customer.homeAddress ?? null,
                company: null,
                notes: '',
            });
            companyMethods.reset(customer.company ? {
                name: customer.company.name,
                nip: customer.company.nip,
                regon: customer.company.regon,
                street: customer.company.address.street,
                city: customer.company.address.city,
                postalCode: customer.company.address.postalCode,
                country: customer.company.address.country,
            } : { name: '', nip: '', regon: '', street: '', city: '', postalCode: '', country: 'Polska' });
        }
    }, [isOpen, customer, initialTab, methods, companyMethods]);

    const { updateCustomer, isUpdating, error, reset: resetMutation } = useUpdateCustomer({
        customerId: customer.id,
        onSuccess: () => { onClose(); },
    });

    const handleSubmit = methods.handleSubmit(data => {
        const hasAddress = !!(data.homeAddress?.street?.trim());
        updateCustomer({
            firstName: data.firstName ?? null,
            lastName: data.lastName ?? null,
            contact: {
                email: data.email ?? null,
                phone: data.phone ?? null,
            },
            homeAddress: hasAddress ? (data.homeAddress ?? null) : null,
        });
    });

    const { updateCompany, isUpdating: isUpdatingCompany, error: companyError } = useUpdateCompany({
        customerId: customer.id,
        onSuccess: () => { onClose(); },
    });

    const { deleteCompany, isDeleting } = useDeleteCompany({
        customerId: customer.id,
        onSuccess: () => { onClose(); },
    });

    const handleCompanySubmit = companyMethods.handleSubmit(data => {
        updateCompany({
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
    });

    const handleGusData = (data: CompanyInfoResponse) => {
        companyMethods.setValue('name', data.name, { shouldValidate: true });
        companyMethods.setValue('regon', data.regon, { shouldValidate: true });
        const { street, buildingNumber, apartmentNumber, city, postalCode, country } = data.address;
        const streetLine = [street, buildingNumber].filter(Boolean).join(' ') +
            (apartmentNumber ? `/${apartmentNumber}` : '');
        const formattedPostal = postalCode?.replace(/^(\d{2})(\d{3})$/, '$1-$2') ?? postalCode ?? '';
        companyMethods.setValue('street', streetLine || '', { shouldValidate: true });
        companyMethods.setValue('city', city ?? '', { shouldValidate: true });
        companyMethods.setValue('postalCode', formattedPostal, { shouldValidate: true });
        companyMethods.setValue('country', country ?? 'Polska', { shouldValidate: true });
    };

    const handleDeleteCompany = () => {
        if (confirm('Czy na pewno chcesz usunąć dane firmy z tego klienta?')) {
            deleteCompany();
        }
    };

    const handleClose = useCallback(() => {
        methods.reset();
        companyMethods.reset();
        resetMutation();
        onClose();
    }, [methods, companyMethods, onClose, resetMutation]);

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Edytuj dane klienta</ModalTitle>
                    <ModalSubtitle>Zaktualizuj dane osobowe i kontaktowe</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent style={{ paddingTop: '8px' }}>
                {error && (
                    <FormAlertBanner>
                        Nie udało się zaktualizować danych klienta. Spróbuj ponownie.
                    </FormAlertBanner>
                )}

                <FormProvider {...methods}>
                    <form id="edit-customer-form" onSubmit={handleSubmit} autoComplete="off">
                        <FormTabBar>
                            <FormTabBtn
                                type="button"
                                $active={activeTab === 'basic'}
                                onClick={() => setActiveTab('basic')}
                            >
                                Dane podstawowe
                            </FormTabBtn>
                            <FormTabBtn
                                type="button"
                                $active={activeTab === 'address'}
                                onClick={() => setActiveTab('address')}
                            >
                                Adres zamieszkania
                            </FormTabBtn>
                            <FormTabBtn
                                type="button"
                                $active={activeTab === 'company'}
                                onClick={() => setActiveTab('company')}
                            >
                                Dane firmy
                            </FormTabBtn>
                        </FormTabBar>

                        {/* ── Dane podstawowe ──────────────────────────────── */}
                        <FormTabPanel $active={activeTab === 'basic'}>
                            <FormGrid>
                                <FormField>
                                    <FieldLabel htmlFor="edit-firstName">
                                        {t.customers.form.firstName}
                                    </FieldLabel>
                                    <InputShell $hasError={!!methods.formState.errors.firstName}>
                                        <BareInput
                                            id="edit-firstName"
                                            autoComplete="new-password"
                                            {...methods.register('firstName')}
                                            placeholder={t.customers.form.firstNamePlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.firstName && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.firstName.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="edit-lastName">
                                        {t.customers.form.lastName}
                                    </FieldLabel>
                                    <InputShell $hasError={!!methods.formState.errors.lastName}>
                                        <BareInput
                                            id="edit-lastName"
                                            autoComplete="new-password"
                                            {...methods.register('lastName')}
                                            placeholder={t.customers.form.lastNamePlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.lastName && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.lastName.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="edit-email">
                                        {t.customers.form.email}
                                    </FieldLabel>
                                    <InputShell $hasError={!!methods.formState.errors.email}>
                                        <BareInput
                                            id="edit-email"
                                            type="email"
                                            autoComplete="new-password"
                                            {...methods.register('email')}
                                            placeholder={t.customers.form.emailPlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.email && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.email.message}
                                        </FormErrorMsg>
                                    )}
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
                        </FormTabPanel>

                        {/* ── Adres zamieszkania ───────────────────────────── */}
                        <FormTabPanel $active={activeTab === 'address'}>
                            <FormGrid>
                                <FormField $fullWidth>
                                    <FieldLabel htmlFor="edit-homeAddress.street">
                                        {t.customers.form.homeAddress.street}
                                    </FieldLabel>
                                    <InputShell
                                        $hasError={!!methods.formState.errors.homeAddress?.street}
                                    >
                                        <BareInput
                                            id="edit-homeAddress.street"
                                            autoComplete="new-password"
                                            {...methods.register('homeAddress.street')}
                                            placeholder={t.customers.form.homeAddress.streetPlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.homeAddress?.street && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.homeAddress.street.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="edit-homeAddress.city">
                                        {t.customers.form.homeAddress.city}
                                    </FieldLabel>
                                    <InputShell
                                        $hasError={!!methods.formState.errors.homeAddress?.city}
                                    >
                                        <BareInput
                                            id="edit-homeAddress.city"
                                            autoComplete="new-password"
                                            {...methods.register('homeAddress.city')}
                                            placeholder={t.customers.form.homeAddress.cityPlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.homeAddress?.city && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.homeAddress.city.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="edit-homeAddress.postalCode">
                                        {t.customers.form.homeAddress.postalCode}
                                    </FieldLabel>
                                    <InputShell
                                        $hasError={!!methods.formState.errors.homeAddress?.postalCode}
                                    >
                                        <BareInput
                                            id="edit-homeAddress.postalCode"
                                            autoComplete="new-password"
                                            {...methods.register('homeAddress.postalCode')}
                                            placeholder={t.customers.form.homeAddress.postalCodePlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.homeAddress?.postalCode && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.homeAddress.postalCode.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="edit-homeAddress.country">
                                        {t.customers.form.homeAddress.country}
                                    </FieldLabel>
                                    <InputShell
                                        $hasError={!!methods.formState.errors.homeAddress?.country}
                                    >
                                        <BareInput
                                            id="edit-homeAddress.country"
                                            autoComplete="new-password"
                                            {...methods.register('homeAddress.country')}
                                            placeholder={t.customers.form.homeAddress.countryPlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.homeAddress?.country && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.homeAddress.country.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>
                            </FormGrid>
                        </FormTabPanel>
                    </form>
                </FormProvider>

                {/* ── Dane firmy ───────────────────────────────────── */}
                <FormProvider {...companyMethods}>
                    <form id="edit-customer-company-form" onSubmit={handleCompanySubmit} autoComplete="off">
                        <FormTabPanel $active={activeTab === 'company'}>
                            {companyError && (
                                <FormAlertBanner>
                                    Nie udało się zaktualizować danych firmy. Spróbuj ponownie.
                                </FormAlertBanner>
                            )}
                            <FormGrid>
                                <FormField $fullWidth>
                                    <FieldLabel htmlFor="ec-company-name">
                                        {t.customers.form.company.name}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyMethods.formState.errors.name}>
                                        <BareInput
                                            id="ec-company-name"
                                            autoComplete="off"
                                            {...companyMethods.register('name')}
                                            placeholder={t.customers.form.company.namePlaceholder}
                                        />
                                    </InputShell>
                                    {companyMethods.formState.errors.name && (
                                        <FormErrorMsg>{companyMethods.formState.errors.name.message}</FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="ec-company-nip">
                                        {t.customers.form.company.nip}
                                    </FieldLabel>
                                    <NipInputWithGus
                                        id="ec-company-nip"
                                        value={companyMethods.watch('nip') ?? ''}
                                        onChange={val => companyMethods.setValue('nip', val, { shouldValidate: companyMethods.formState.isSubmitted })}
                                        onFetch={handleGusData}
                                        hasError={!!companyMethods.formState.errors.nip}
                                        placeholder={t.customers.form.company.nipPlaceholder}
                                    />
                                    {companyMethods.formState.errors.nip && (
                                        <FormErrorMsg>{companyMethods.formState.errors.nip.message}</FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="ec-company-regon">
                                        {t.customers.form.company.regon}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyMethods.formState.errors.regon}>
                                        <BareInput
                                            id="ec-company-regon"
                                            autoComplete="off"
                                            {...companyMethods.register('regon')}
                                            placeholder={t.customers.form.company.regonPlaceholder}
                                        />
                                    </InputShell>
                                    {companyMethods.formState.errors.regon && (
                                        <FormErrorMsg>{companyMethods.formState.errors.regon.message}</FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField $fullWidth>
                                    <FieldLabel htmlFor="ec-company-street">
                                        {t.customers.form.company.street}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyMethods.formState.errors.street}>
                                        <BareInput
                                            id="ec-company-street"
                                            autoComplete="off"
                                            {...companyMethods.register('street')}
                                            placeholder={t.customers.form.company.streetPlaceholder}
                                        />
                                    </InputShell>
                                    {companyMethods.formState.errors.street && (
                                        <FormErrorMsg>{companyMethods.formState.errors.street.message}</FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="ec-company-city">
                                        {t.customers.form.company.city}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyMethods.formState.errors.city}>
                                        <BareInput
                                            id="ec-company-city"
                                            autoComplete="off"
                                            {...companyMethods.register('city')}
                                            placeholder={t.customers.form.company.cityPlaceholder}
                                        />
                                    </InputShell>
                                    {companyMethods.formState.errors.city && (
                                        <FormErrorMsg>{companyMethods.formState.errors.city.message}</FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="ec-company-postalCode">
                                        {t.customers.form.company.postalCode}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyMethods.formState.errors.postalCode}>
                                        <BareInput
                                            id="ec-company-postalCode"
                                            autoComplete="off"
                                            {...companyMethods.register('postalCode')}
                                            placeholder={t.customers.form.company.postalCodePlaceholder}
                                        />
                                    </InputShell>
                                    {companyMethods.formState.errors.postalCode && (
                                        <FormErrorMsg>{companyMethods.formState.errors.postalCode.message}</FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="ec-company-country">
                                        {t.customers.form.company.country}
                                    </FieldLabel>
                                    <InputShell $hasError={!!companyMethods.formState.errors.country}>
                                        <BareInput
                                            id="ec-company-country"
                                            autoComplete="off"
                                            {...companyMethods.register('country')}
                                            placeholder={t.customers.form.company.countryPlaceholder}
                                        />
                                    </InputShell>
                                    {companyMethods.formState.errors.country && (
                                        <FormErrorMsg>{companyMethods.formState.errors.country.message}</FormErrorMsg>
                                    )}
                                </FormField>
                            </FormGrid>
                        </FormTabPanel>
                    </form>
                </FormProvider>
            </ModalContent>

            <ModalFooter style={{ justifyContent: activeTab === 'company' && customer.company ? 'space-between' : 'flex-end' }}>
                {activeTab === 'company' && customer.company && (
                    <SharedButton
                        $variant="danger"
                        type="button"
                        onClick={handleDeleteCompany}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Usuwanie...' : 'Usuń firmę'}
                    </SharedButton>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <SharedButton $variant="secondary" type="button" onClick={handleClose}>
                        {t.common.cancel}
                    </SharedButton>
                    <SharedButton
                        $variant="primary"
                        type="submit"
                        form={activeTab === 'company' ? 'edit-customer-company-form' : 'edit-customer-form'}
                        disabled={activeTab === 'company' ? isUpdatingCompany : isUpdating}
                    >
                        {(activeTab === 'company' ? isUpdatingCompany : isUpdating)
                            ? t.customers.form.submitting
                            : t.common.save}
                    </SharedButton>
                </div>
            </ModalFooter>
        </ModalShell>
    );
};
