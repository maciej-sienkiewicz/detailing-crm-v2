import { useCallback, useEffect } from 'react';
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
import { FormAlertBanner } from '@/common/components/Form';
import type { Customer } from '../types';

interface AddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (customer: Customer) => void;
    initialValues?: Partial<Pick<CreateCustomerFormData, 'firstName' | 'lastName' | 'email' | 'phone'>>;
}

export const AddCustomerModal = ({
    isOpen,
    onClose,
    onSuccess,
    initialValues,
}: AddCustomerModalProps) => {
    const methods = useForm<CreateCustomerFormData>({
        resolver: (values, context, options) => {
            // Include address only if street was filled; include company only if name was filled.
            // This matches the tab-based UX where unfilled optional tabs are treated as null.
            const hasAddress = !!(values.homeAddress?.street?.trim());
            const hasCompany = !!(values.company?.name?.trim());
            const dataToValidate = {
                ...values,
                homeAddress: hasAddress ? values.homeAddress : null,
                company: hasCompany ? values.company : null,
            };
            return zodResolver(createCustomerSchema)(dataToValidate, context, options);
        },
        defaultValues: {
            firstName: initialValues?.firstName ?? '',
            lastName:  initialValues?.lastName  ?? '',
            email:     initialValues?.email     ?? '',
            phone:     initialValues?.phone     ?? '',
            homeAddress: null,
            company: null,
            notes: '',
        },
    });

    useEffect(() => {
        if (isOpen) {
            methods.reset({
                firstName: initialValues?.firstName ?? '',
                lastName:  initialValues?.lastName  ?? '',
                email:     initialValues?.email     ?? '',
                phone:     initialValues?.phone     ?? '',
                homeAddress: null,
                company: null,
                notes: '',
            });
        }
    }, [isOpen]);

    const handleSuccess = useCallback((customer: Customer) => {
        methods.reset();
        onSuccess(customer);
        onClose();
    }, [methods, onClose, onSuccess]);

    const { createCustomer, isCreating, error, reset: resetMutation } = useCreateCustomer({
        onSuccess: handleSuccess,
    });

    const handleSubmit = methods.handleSubmit(data => {
        const hasAddress = !!(data.homeAddress?.street?.trim());
        const hasCompany = !!(data.company?.name?.trim());
        const payload = mapFormDataToPayload({
            ...data,
            homeAddress: hasAddress ? data.homeAddress : null,
            company: hasCompany ? data.company : null,
        });
        createCustomer(payload);
    });

    const handleClose = useCallback(() => {
        methods.reset();
        resetMutation();
        onClose();
    }, [methods, onClose, resetMutation]);

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{t.customers.form.title}</ModalTitle>
                    <ModalSubtitle>Wypełnij dane nowego klienta</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent style={{ paddingTop: '8px' }}>
                {error && (
                    <FormAlertBanner>{t.customers.error.createFailed}</FormAlertBanner>
                )}

                <FormProvider {...methods}>
                    <form id="add-customer-form" onSubmit={handleSubmit} autoComplete="off">
                        <CustomerForm />
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
