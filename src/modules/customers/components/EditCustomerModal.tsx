// src/modules/customers/components/EditCustomerModal.tsx

import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import styled, { keyframes } from 'styled-components';
import { useUpdateCustomer } from '../hooks/useUpdateCustomer';
import { createCustomerSchema, type CreateCustomerFormData } from '../utils/customerValidation';
import { t } from '@/common/i18n';
import type { Customer } from '../types';
import { PhoneInputField } from '@/common/components/PhoneInputField';

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const slideIn = keyframes`
    from {
        opacity: 0;
        transform: translate(-50%, -48%) scale(0.96);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
`;

const Overlay = styled(Dialog.Overlay)`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    z-index: 100;
    animation: ${fadeIn} 0.2s ease-out;
`;

const Content = styled(Dialog.Content)`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 640px;
    max-height: 90vh;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 20px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
    z-index: 101;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: ${slideIn} 0.25s cubic-bezier(0.32, 0.72, 0, 1);
`;

const Header = styled.header`
    padding: 24px 32px;
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    flex-shrink: 0;
`;

const Title = styled(Dialog.Title)`
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.025em;
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: 14px;
    color: #64748b;
`;

const Body = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 32px;
    
    &::-webkit-scrollbar {
        width: 6px;
    }
    
    &::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 3px;
    }
`;

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

const Footer = styled.footer`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 24px 32px;
    background: linear-gradient(180deg, #fafbfc 0%, #f1f5f9 100%);
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    flex-shrink: 0;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 24px;
    min-width: 120px;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
    
    ${props => props.$variant === 'primary' ? `
        background: linear-gradient(180deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 90%, black) 100%);
        color: white;
        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
        
        &:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(14, 165, 233, 0.4);
        }
    ` : `
        background: white;
        color: #374151;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.08);
        
        &:hover:not(:disabled) {
            background: #f9fafb;
        }
    `}

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
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
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Overlay />
                <Content>
                    <Header>
                        <Title>Edytuj dane klienta</Title>
                        <Subtitle>Zaktualizuj dane osobowe i kontaktowe</Subtitle>
                    </Header>

                    <Body>
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
                    </Body>

                    <Footer>
                        <Button type="button" onClick={onClose}>
                            {t.common.cancel}
                        </Button>
                        <Button
                            type="submit"
                            form="edit-customer-form"
                            $variant="primary"
                            disabled={isUpdating}
                        >
                            {isUpdating ? t.customers.form.submitting : t.common.save}
                        </Button>
                    </Footer>
                </Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};