// src/modules/customers/components/EditCustomerModal.tsx

import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import styled from 'styled-components';
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

const FormGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const FormField = styled.div<{ $fullWidth?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 6px;

    ${props => props.$fullWidth && `
        @media (min-width: ${props.theme.breakpoints.sm}) {
            grid-column: span 2;
        }
    `}
`;

const Label = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: #374151;
`;

const InputWrapper = styled.div<{ $hasError?: boolean }>`
    display: flex;
    align-items: center;
    background: white;
    border: 1.5px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
    border-radius: 10px;
    transition: all 0.2s ease;

    &:focus-within {
        border-color: ${props => props.$hasError ? '#ef4444' : 'var(--brand-primary)'};
        box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)'};
    }
`;

const Input = styled.input`
    width: 100%;
    padding: 12px 14px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    background: transparent;
    color: #0f172a;

    &:focus {
        outline: none;
    }

    &::placeholder {
        color: #94a3b8;
    }
`;

const ErrorMessage = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #ef4444;
    font-weight: 500;
`;

interface EditCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
}

export const EditCustomerModal = ({ isOpen, onClose, customer }: EditCustomerModalProps) => {
    const methods = useForm<CreateCustomerFormData>({
        resolver: zodResolver(createCustomerSchema),
        defaultValues: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.contact.email,
            phone: customer.contact.phone,
            homeAddress: customer.homeAddress,
            company: null,
        },
    });

    useEffect(() => {
        if (isOpen && customer) {
            methods.reset({
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.contact.email,
                phone: customer.contact.phone,
                homeAddress: customer.homeAddress,
                company: null,
            });
        }
    }, [isOpen, customer, methods]);

    const { updateCustomer, isUpdating } = useUpdateCustomer({
        customerId: customer.id,
        onSuccess: () => {
            onClose();
        },
    });

    const handleSubmit = methods.handleSubmit(data => {
        updateCustomer({
            firstName: data.firstName,
            lastName: data.lastName,
            contact: {
                email: data.email,
                phone: data.phone,
            },
            homeAddress: data.homeAddress,
        });
    });

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="640px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Edytuj dane klienta</ModalTitle>
                    <ModalSubtitle>Zaktualizuj dane osobowe i kontaktowe</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <FormProvider {...methods}>
                    <form id="edit-customer-form" onSubmit={handleSubmit}>
                        <FormGrid>
                            <FormField>
                                <Label>{t.customers.form.firstName}</Label>
                                <InputWrapper $hasError={!!methods.formState.errors.firstName}>
                                    <Input
                                        {...methods.register('firstName')}
                                        placeholder={t.customers.form.firstNamePlaceholder}
                                    />
                                </InputWrapper>
                                {methods.formState.errors.firstName && (
                                    <ErrorMessage>
                                        {methods.formState.errors.firstName.message}
                                    </ErrorMessage>
                                )}
                            </FormField>

                            <FormField>
                                <Label>{t.customers.form.lastName}</Label>
                                <InputWrapper $hasError={!!methods.formState.errors.lastName}>
                                    <Input
                                        {...methods.register('lastName')}
                                        placeholder={t.customers.form.lastNamePlaceholder}
                                    />
                                </InputWrapper>
                                {methods.formState.errors.lastName && (
                                    <ErrorMessage>
                                        {methods.formState.errors.lastName.message}
                                    </ErrorMessage>
                                )}
                            </FormField>

                            <FormField>
                                <Label>{t.customers.form.email}</Label>
                                <InputWrapper $hasError={!!methods.formState.errors.email}>
                                    <Input
                                        {...methods.register('email')}
                                        type="email"
                                        placeholder={t.customers.form.emailPlaceholder}
                                    />
                                </InputWrapper>
                                {methods.formState.errors.email && (
                                    <ErrorMessage>
                                        {methods.formState.errors.email.message}
                                    </ErrorMessage>
                                )}
                            </FormField>

                            <FormField>
                                <Label>{t.customers.form.phone}</Label>
                                <PhoneInputField
                                    name="phone"
                                    placeholder={t.customers.form.phonePlaceholder}
                                />
                            </FormField>

                            {customer.homeAddress && (
                                <>
                                    <FormField $fullWidth>
                                        <Label>{t.customers.form.homeAddress.street}</Label>
                                        <InputWrapper $hasError={!!methods.formState.errors.homeAddress?.street}>
                                            <Input
                                                {...methods.register('homeAddress.street')}
                                                placeholder={t.customers.form.homeAddress.streetPlaceholder}
                                            />
                                        </InputWrapper>
                                    </FormField>

                                    <FormField>
                                        <Label>{t.customers.form.homeAddress.city}</Label>
                                        <InputWrapper $hasError={!!methods.formState.errors.homeAddress?.city}>
                                            <Input
                                                {...methods.register('homeAddress.city')}
                                                placeholder={t.customers.form.homeAddress.cityPlaceholder}
                                            />
                                        </InputWrapper>
                                    </FormField>

                                    <FormField>
                                        <Label>{t.customers.form.homeAddress.postalCode}</Label>
                                        <InputWrapper $hasError={!!methods.formState.errors.homeAddress?.postalCode}>
                                            <Input
                                                {...methods.register('homeAddress.postalCode')}
                                                placeholder={t.customers.form.homeAddress.postalCodePlaceholder}
                                            />
                                        </InputWrapper>
                                    </FormField>
                                </>
                            )}
                        </FormGrid>
                    </form>
                </FormProvider>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose}>
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
