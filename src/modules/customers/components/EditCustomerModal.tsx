import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateCustomer } from '../hooks/useUpdateCustomer';
import { createCustomerSchema, type CreateCustomerFormData } from '../utils/customerValidation';
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

type TabId = 'basic' | 'address';

interface EditCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
}

export const EditCustomerModal = ({ isOpen, onClose, customer }: EditCustomerModalProps) => {
    const [activeTab, setActiveTab] = useState<TabId>('basic');

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

    useEffect(() => {
        if (isOpen && customer) {
            setActiveTab('basic');
            methods.reset({
                firstName: customer.firstName ?? '',
                lastName: customer.lastName ?? '',
                email: customer.contact.email ?? '',
                phone: customer.contact.phone ?? '',
                homeAddress: customer.homeAddress ?? null,
                company: null,
                notes: '',
            });
        }
    }, [isOpen, customer, methods]);

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

    const handleClose = useCallback(() => {
        methods.reset();
        resetMutation();
        onClose();
    }, [methods, onClose, resetMutation]);

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} maxWidth="640px">
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
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={handleClose}>
                    {t.common.cancel}
                </SharedButton>
                <SharedButton
                    $variant="primary"
                    type="submit"
                    form="edit-customer-form"
                    disabled={isUpdating}
                >
                    {isUpdating ? t.customers.form.submitting : t.common.save}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
