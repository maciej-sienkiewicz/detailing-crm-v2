import { useState, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CustomerForm } from './CustomerForm';
import { useCreateCustomer } from '../hooks/useCreateCustomer';
import {
    createCustomerSchema,
    type CreateCustomerFormData,
} from '../utils/customerValidation';
import { mapFormDataToPayload } from '../utils/customerMappers';
import { t } from '@/common/i18n';
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

import type { Customer } from '../types';

interface AddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (customer: Customer) => void;
}

export const AddCustomerModal = ({
    isOpen,
    onClose,
    onSuccess,
}: AddCustomerModalProps) => {
    const [includeCompany, setIncludeCompany] = useState(false);
    const [includeHomeAddress, setIncludeHomeAddress] = useState(false);

    const methods = useForm<CreateCustomerFormData>({
        resolver: (values, context, options) => {
            // Czyścimy dane przed walidacją: jeśli sekcja jest wyłączona, wymuszamy czysty null
            const dataToValidate = {
                ...values,
                company: includeCompany ? values.company : null,
                homeAddress: includeHomeAddress ? values.homeAddress : null,
            };

            return zodResolver(createCustomerSchema)(dataToValidate, context, options);
        },
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            homeAddress: null,
            company: null,
            notes: '',
        },
    });

    const handleSuccess = useCallback((customer: Customer) => {
        methods.reset();
        setIncludeCompany(false);
        setIncludeHomeAddress(false);
        onSuccess(customer);
        onClose();
    }, [methods, onClose, onSuccess]);

    const { createCustomer, isCreating, error, reset: resetMutation } = useCreateCustomer({
        onSuccess: handleSuccess,
    });

    const handleSubmit = methods.handleSubmit(
        (data) => {
            console.log("Dane poprawne, wysyłam:", data);
            const payload = mapFormDataToPayload({
                ...data,
                homeAddress: includeHomeAddress ? data.homeAddress : null,
                company: includeCompany ? data.company : null,
            });
            createCustomer(payload);
        },
        (errors) => {
            // Jeśli to się pojawi w konsoli, znaczy że formularz jest niepoprawny
            console.error("Błędy walidacji:", errors);
        }
    );

    const handleClose = useCallback(() => {
        methods.reset();
        resetMutation();
        setIncludeCompany(false);
        setIncludeHomeAddress(false);
        onClose();
    }, [methods, onClose, resetMutation]);

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} maxWidth="640px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{t.customers.form.title}</ModalTitle>
                    <ModalSubtitle>Wypełnij dane nowego klienta</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                {error && (
                    <div style={{
                        padding: '12px 16px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '10px',
                        marginBottom: '24px',
                        fontSize: '14px',
                        color: '#b91c1c',
                    }}>
                        {t.customers.error.createFailed}
                    </div>
                )}

                <FormProvider {...methods}>
                    <form id="add-customer-form" onSubmit={handleSubmit}>
                        <CustomerForm
                            includeCompany={includeCompany}
                            onIncludeCompanyChange={setIncludeCompany}
                            includeHomeAddress={includeHomeAddress}
                            onIncludeHomeAddressChange={setIncludeHomeAddress}
                        />
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
                    form="add-customer-form"
                    disabled={isCreating}
                >
                    {isCreating ? t.customers.form.submitting : t.customers.form.submit}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
