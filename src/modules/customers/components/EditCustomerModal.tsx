import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Home } from 'lucide-react';
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
    FormSection,
    SectionHeader,
    ToggleCard,
    ToggleSwitch,
    ToggleContent,
    ToggleTitle,
    ToggleDescription,
    HiddenCheckbox,
    ExpandableSection,
    ExpandableContent,
} from '@/common/components/Form';

interface EditCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
}

export const EditCustomerModal = ({ isOpen, onClose, customer }: EditCustomerModalProps) => {
    const [includeHomeAddress, setIncludeHomeAddress] = useState(!!customer.homeAddress);

    const methods = useForm<CreateCustomerFormData>({
        resolver: (values, context, options) => {
            const dataToValidate = {
                ...values,
                homeAddress: includeHomeAddress ? values.homeAddress : null,
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
            const hasAddress = !!customer.homeAddress;
            setIncludeHomeAddress(hasAddress);
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
        onSuccess: () => {
            onClose();
        },
    });

    const handleSubmit = methods.handleSubmit(data => {
        updateCustomer({
            firstName: data.firstName ?? null,
            lastName: data.lastName ?? null,
            contact: {
                email: data.email ?? null,
                phone: data.phone ?? null,
            },
            homeAddress: includeHomeAddress ? (data.homeAddress ?? null) : null,
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

            <ModalContent>
                {error && (
                    <FormAlertBanner>
                        Nie udało się zaktualizować danych klienta. Spróbuj ponownie.
                    </FormAlertBanner>
                )}

                <FormProvider {...methods}>
                    <form id="edit-customer-form" onSubmit={handleSubmit}>
                        {/* ── Dane osobowe ──────────────────────────────────── */}
                        <FormSection>
                            <FormGrid>
                                <FormField>
                                    <FieldLabel htmlFor="edit-firstName">
                                        {t.customers.form.firstName}
                                    </FieldLabel>
                                    <InputShell $hasError={!!methods.formState.errors.firstName}>
                                        <BareInput
                                            id="edit-firstName"
                                            autoComplete="off"
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
                                            autoComplete="off"
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
                                            autoComplete="off"
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
                        </FormSection>

                        {/* ── Adres zamieszkania (opcjonalny) ───────────────── */}
                        <FormSection>
                            <ToggleCard $isActive={includeHomeAddress}>
                                <HiddenCheckbox
                                    type="checkbox"
                                    checked={includeHomeAddress}
                                    onChange={e => setIncludeHomeAddress(e.target.checked)}
                                />
                                <ToggleSwitch $isActive={includeHomeAddress} />
                                <ToggleContent>
                                    <ToggleTitle>{t.customers.form.includeHomeAddress}</ToggleTitle>
                                    <ToggleDescription>
                                        Adres zamieszkania do korespondencji
                                    </ToggleDescription>
                                </ToggleContent>
                            </ToggleCard>

                            <ExpandableSection $isExpanded={includeHomeAddress}>
                                <ExpandableContent>
                                    <SectionHeader
                                        icon={<Home />}
                                        iconColor="#10b981"
                                        title={t.customers.form.homeAddress.title}
                                        subtitle="Dane adresowe klienta"
                                    />

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
                                                    autoComplete="off"
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
                                                    autoComplete="off"
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
                                                    autoComplete="off"
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
                                                    autoComplete="off"
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
                                </ExpandableContent>
                            </ExpandableSection>
                        </FormSection>
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
