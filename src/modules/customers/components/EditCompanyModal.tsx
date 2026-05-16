// src/modules/customers/components/EditCompanyModal.tsx

import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styled from 'styled-components';
import { useUpdateCompany } from '../hooks/useUpdateCompany';
import { useDeleteCompany } from '../hooks/useDeleteCompany';
import { validatePolishNip, validatePolishRegon } from '../utils/polishValidators';
import { t } from '@/common/i18n';
import type { CompanyDetails } from '../types';
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
    company,
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
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="640px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>
                        {company ? 'Edytuj dane firmy' : 'Dodaj dane firmy'}
                    </ModalTitle>
                    <ModalSubtitle>
                        {company
                            ? 'Zaktualizuj dane rejestrowe firmy'
                            : 'Wprowadź dane rejestrowe firmy klienta'
                        }
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
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
            </ModalContent>

            <ModalFooter style={{ justifyContent: 'space-between' }}>
                <div>
                    {company && (
                        <SharedButton
                            $variant="danger"
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Usuwanie...' : 'Usuń firmę'}
                        </SharedButton>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <SharedButton $variant="secondary" type="button" onClick={onClose}>
                        {t.common.cancel}
                    </SharedButton>
                    <SharedButton
                        $variant="primary"
                        type="submit"
                        form="edit-company-form"
                        disabled={isUpdating}
                    >
                        {isUpdating ? t.customers.form.submitting : t.common.save}
                    </SharedButton>
                </div>
            </ModalFooter>
        </ModalShell>
    );
};
