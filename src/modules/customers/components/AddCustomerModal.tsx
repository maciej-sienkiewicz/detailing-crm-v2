import { useState, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import styled, { keyframes } from 'styled-components';
import { CustomerForm } from './CustomerForm';
import { useCreateCustomer } from '../hooks/useCreateCustomer';
import {
    createCustomerSchema,
    type CreateCustomerFormData,
} from '../utils/customerValidation';
import { mapFormDataToPayload } from '../utils/customerMappers';
import { t } from '@/common/i18n';

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
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

const slideInMobile = keyframes`
    from {
        transform: translateX(100%);
    }
    to {
        transform: translateX(0);
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
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 540px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    box-shadow: 
        -20px 0 60px rgba(0, 0, 0, 0.15),
        -1px 0 0 rgba(0, 0, 0, 0.05);
    z-index: 101;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: ${slideInMobile} 0.3s cubic-bezier(0.32, 0.72, 0, 1);

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        top: 50%;
        right: auto;
        left: 50%;
        bottom: auto;
        transform: translate(-50%, -50%);
        max-height: 90vh;
        max-width: 640px;
        border-radius: 20px;
        animation: ${slideIn} 0.25s cubic-bezier(0.32, 0.72, 0, 1);
        box-shadow: 
            0 24px 80px rgba(0, 0, 0, 0.2),
            0 8px 24px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(0, 0, 0, 0.05);
    }
`;

const Header = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    flex-shrink: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 24px 32px;
    }
`;

const HeaderContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Title = styled(Dialog.Title)`
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.025em;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: 22px;
    }
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: 14px;
    color: #64748b;
    font-weight: 400;
`;

const CloseButton = styled(Dialog.Close)`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 12px;
    background: #f1f5f9;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: #e2e8f0;
        color: #0f172a;
        transform: scale(1.05);
    }

    &:active {
        transform: scale(0.95);
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

const Body = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    
    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 32px;
    }

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }
`;

const Footer = styled.footer`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 20px 24px;
    background: linear-gradient(180deg, #fafbfc 0%, #f1f5f9 100%);
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    flex-shrink: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 24px 32px;
    }
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
        box-shadow: 
            0 2px 8px rgba(14, 165, 233, 0.3),
            0 1px 2px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        
        &:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 
                0 4px 16px rgba(14, 165, 233, 0.4),
                0 2px 4px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        
        &:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: 
                0 1px 4px rgba(14, 165, 233, 0.3),
                inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }
    ` : `
        background: white;
        color: #374151;
        box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(0, 0, 0, 0.08);
        
        &:hover:not(:disabled) {
            background: #f9fafb;
            box-shadow: 
                0 2px 6px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(0, 0, 0, 0.1);
        }
        
        &:active:not(:disabled) {
            background: #f3f4f6;
        }
    `}

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }
`;

const LoadingSpinner = styled.span`
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const ErrorAlert = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%);
    border: 1px solid #fecaca;
    border-radius: 12px;
    margin-bottom: 24px;
`;

const ErrorIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: #dc2626;
    border-radius: 10px;
    flex-shrink: 0;
    
    svg {
        width: 20px;
        height: 20px;
        color: white;
    }
`;

const ErrorContent = styled.div`
    flex: 1;
`;

const ErrorTitle = styled.p`
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: #991b1b;
`;

const ErrorMessage = styled.p`
    margin: 0;
    font-size: 13px;
    color: #b91c1c;
`;

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const AlertIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

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
        <Dialog.Root open={isOpen} onOpenChange={open => !open && handleClose()}>
            <Dialog.Portal>
                <Overlay />
                <Content>
                    <Header>
                        <HeaderContent>
                            <Title>{t.customers.form.title}</Title>
                            <Subtitle>Wypełnij dane nowego klienta</Subtitle>
                        </HeaderContent>
                        <CloseButton aria-label={t.common.close}>
                            <CloseIcon />
                        </CloseButton>
                    </Header>

                    <Body>
                        {error && (
                            <ErrorAlert>
                                <ErrorIcon>
                                    <AlertIcon />
                                </ErrorIcon>
                                <ErrorContent>
                                    <ErrorTitle>Wystąpił błąd</ErrorTitle>
                                    <ErrorMessage>{t.customers.error.createFailed}</ErrorMessage>
                                </ErrorContent>
                            </ErrorAlert>
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
                    </Body>

                    <Footer>
                        <Button type="button" onClick={handleClose}>
                            {t.common.cancel}
                        </Button>
                        <Button
                            type="submit"
                            form="add-customer-form"
                            $variant="primary"
                            disabled={isCreating}
                        >
                            {isCreating && <LoadingSpinner />}
                            {isCreating ? t.customers.form.submitting : t.customers.form.submit}
                        </Button>
                    </Footer>
                </Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};