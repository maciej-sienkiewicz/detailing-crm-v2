// src/modules/customers/components/EditCompanyModal.tsx

import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import { z } from 'zod';
import styled, { keyframes } from 'styled-components';
import { useUpdateCompany } from '../hooks/useUpdateCompany';
import { useDeleteCompany } from '../hooks/useDeleteCompany';
import { validatePolishNip, validatePolishRegon } from '../utils/polishValidators';
import { t } from '@/common/i18n';
import type { CompanyDetails } from '../types';

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
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px 32px;
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    flex-shrink: 0;
`;

const HeaderContent = styled.div`
    flex: 1;
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
    flex-shrink: 0;

    &:hover {
        background: #e2e8f0;
        color: #0f172a;
    }

    svg {
        width: 20px;
        height: 20px;
    }
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
    justify-content: space-between;
    padding: 24px 32px;
    background: linear-gradient(180deg, #fafbfc 0%, #f1f5f9 100%);
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    flex-shrink: 0;
`;

const FooterLeft = styled.div`
    display: flex;
    gap: 12px;
`;

const FooterRight = styled.div`
    display: flex;
    gap: 12px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
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
    
    ${props => {
    if (props.$variant === 'primary') {
        return `
                background: linear-gradient(180deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 90%, black) 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
                
                &:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 16px rgba(14, 165, 233, 0.4);
                }
            `;
    } else if (props.$variant === 'danger') {
        return `
                background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
                
                &:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
                }
            `;
    } else {
        return `
                background: white;
                color: #374151;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.08);
                
                &:hover:not(:disabled) {
                    background: #f9fafb;
                }
            `;
    }
}}

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

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
    postalCode: z
        .string()
        .regex(/^\d{2}-\d{3}$/, t.customers.validation.postalCodeInvalid),
    country: z.string().min(1, t.customers.validation.countryRequired),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface EditCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    company: CompanyDetails | null;
}

export const EditCompanyModal = ({
                                     isOpen,
                                     onClose,
                                     customerId,
                                     company
                                 }: EditCompanyModalProps) => {
    const methods = useForm<CompanyFormData>({
        resolver: zodResolver(companySchema),
        defaultValues: company ? {
            name: company.name,
            nip: company.nip,
            regon: company.regon,
            street: company.address.street,
            city: company.address.city,
            postalCode: company.address.postalCode,
            country: company.address.country,
        } : {
            name: '',
            nip: '',
            regon: '',
            street: '',
            city: '',
            postalCode: '',
            country: 'Polska',
        },
    });

    useEffect(() => {
        if (isOpen) {
            methods.reset(company ? {
                name: company.name,
                nip: company.nip,
                regon: company.regon,
                street: company.address.street,
                city: company.address.city,
                postalCode: company.address.postalCode,
                country: company.address.country,
            } : {
                name: '',
                nip: '',
                regon: '',
                street: '',
                city: '',
                postalCode: '',
                country: 'Polska',
            });
        }
    }, [isOpen, company, methods]);

    const { updateCompany, isUpdating } = useUpdateCompany({
        customerId,
        onSuccess: () => {
            onClose();
        },
    });

    const { deleteCompany, isDeleting } = useDeleteCompany({
        customerId,
        onSuccess: () => {
            onClose();
        },
    });

    const handleSubmit = methods.handleSubmit(data => {
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

    const handleDelete = () => {
        if (confirm('Czy na pewno chcesz usunąć dane firmy z tego klienta?')) {
            deleteCompany();
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Overlay />
                <Content>
                    <Header>
                        <HeaderContent>
                            <Title>
                                {company ? 'Edytuj dane firmy' : 'Dodaj dane firmy'}
                            </Title>
                            <Subtitle>
                                {company
                                    ? 'Zaktualizuj dane rejestrowe firmy'
                                    : 'Wprowadź dane rejestrowe firmy klienta'
                                }
                            </Subtitle>
                        </HeaderContent>
                        <CloseButton>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </CloseButton>
                    </Header>

                    <Body>
                        <FormProvider {...methods}>
                            <form id="edit-company-form" onSubmit={handleSubmit}>
                                <FormGrid>
                                    <FormField $fullWidth>
                                        <Label>{t.customers.form.company.name}</Label>
                                        <InputWrapper $hasError={!!methods.formState.errors.name}>
                                            <Input
                                                {...methods.register('name')}
                                                placeholder={t.customers.form.company.namePlaceholder}
                                            />
                                        </InputWrapper>
                                        {methods.formState.errors.name && (
                                            <ErrorMessage>
                                                {methods.formState.errors.name.message}
                                            </ErrorMessage>
                                        )}
                                    </FormField>

                                    <FormField>
                                        <Label>{t.customers.form.company.nip}</Label>
                                        <InputWrapper $hasError={!!methods.formState.errors.nip}>
                                            <Input
                                                {...methods.register('nip')}
                                                placeholder={t.customers.form.company.nipPlaceholder}
                                            />
                                        </InputWrapper>
                                        {methods.formState.errors.nip && (
                                            <ErrorMessage>
                                                {methods.formState.errors.nip.message}
                                            </ErrorMessage>
                                        )}
                                    </FormField>

                                    <FormField>
                                        <Label>{t.customers.form.company.regon}</Label>
                                        <InputWrapper $hasError={!!methods.formState.errors.regon}>
                                            <Input
                                                {...methods.register('regon')}
                                                placeholder={t.customers.form.company.regonPlaceholder}
                                            />
                                        </InputWrapper>
                                        {methods.formState.errors.regon && (
                                            <ErrorMessage>
                                                {methods.formState.errors.regon.message}
                                            </ErrorMessage>
                                        )}
                                    </FormField>

                                    <FormField $fullWidth>
                                        <Label>{t.customers.form.company.street}</Label>
                                        <InputWrapper $hasError={!!methods.formState.errors.street}>
                                            <Input
                                                {...methods.register('street')}
                                                placeholder={t.customers.form.company.streetPlaceholder}
                                            />
                                        </InputWrapper>
                                        {methods.formState.errors.street && (
                                            <ErrorMessage>
                                                {methods.formState.errors.street.message}
                                            </ErrorMessage>
                                        )}
                                    </FormField>

                                    <FormField>
                                        <Label>{t.customers.form.company.city}</Label>
                                        <InputWrapper $hasError={!!methods.formState.errors.city}>
                                            <Input
                                                {...methods.register('city')}
                                                placeholder={t.customers.form.company.cityPlaceholder}
                                            />
                                        </InputWrapper>
                                        {methods.formState.errors.city && (
                                            <ErrorMessage>
                                                {methods.formState.errors.city.message}
                                            </ErrorMessage>
                                        )}
                                    </FormField>

                                    <FormField>
                                        <Label>{t.customers.form.company.postalCode}</Label>
                                        <InputWrapper $hasError={!!methods.formState.errors.postalCode}>
                                            <Input
                                                {...methods.register('postalCode')}
                                                placeholder={t.customers.form.company.postalCodePlaceholder}
                                            />
                                        </InputWrapper>
                                        {methods.formState.errors.postalCode && (
                                            <ErrorMessage>
                                                {methods.formState.errors.postalCode.message}
                                            </ErrorMessage>
                                        )}
                                    </FormField>
                                </FormGrid>
                            </form>
                        </FormProvider>
                    </Body>

                    <Footer>
                        <FooterLeft>
                            {company && (
                                <Button
                                    type="button"
                                    $variant="danger"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? 'Usuwanie...' : 'Usuń firmę'}
                                </Button>
                            )}
                        </FooterLeft>
                        <FooterRight>
                            <Button type="button" onClick={onClose}>
                                {t.common.cancel}
                            </Button>
                            <Button
                                type="submit"
                                form="edit-company-form"
                                $variant="primary"
                                disabled={isUpdating}
                            >
                                {isUpdating ? t.customers.form.submitting : t.common.save}
                            </Button>
                        </FooterRight>
                    </Footer>
                </Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};