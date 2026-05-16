import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2 } from 'lucide-react';
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

    const { updateCompany, isUpdating, error } = useUpdateCompany({
        customerId,
        onSuccess: () => { onClose(); },
    });

    const { deleteCompany, isDeleting } = useDeleteCompany({
        customerId,
        onSuccess: () => { onClose(); },
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
                {error && (
                    <FormAlertBanner>
                        Nie udało się zaktualizować danych firmy. Spróbuj ponownie.
                    </FormAlertBanner>
                )}

                <FormProvider {...methods}>
                    <form id="edit-company-form" onSubmit={handleSubmit}>
                        <FormSection>
                            <SectionHeader
                                icon={<Building2 />}
                                iconColor="#f59e0b"
                                title={t.customers.form.company.title}
                                subtitle="Dane rejestrowe firmy"
                            />

                            <FormGrid>
                                <FormField $fullWidth>
                                    <FieldLabel htmlFor="company-name">
                                        {t.customers.form.company.name}
                                    </FieldLabel>
                                    <InputShell $hasError={!!methods.formState.errors.name}>
                                        <BareInput
                                            id="company-name"
                                            {...methods.register('name')}
                                            placeholder={t.customers.form.company.namePlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.name && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.name.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="company-nip">
                                        {t.customers.form.company.nip}
                                    </FieldLabel>
                                    <InputShell $hasError={!!methods.formState.errors.nip}>
                                        <BareInput
                                            id="company-nip"
                                            {...methods.register('nip')}
                                            placeholder={t.customers.form.company.nipPlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.nip && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.nip.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="company-regon">
                                        {t.customers.form.company.regon}
                                    </FieldLabel>
                                    <InputShell $hasError={!!methods.formState.errors.regon}>
                                        <BareInput
                                            id="company-regon"
                                            {...methods.register('regon')}
                                            placeholder={t.customers.form.company.regonPlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.regon && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.regon.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField $fullWidth>
                                    <FieldLabel htmlFor="company-street">
                                        {t.customers.form.company.street}
                                    </FieldLabel>
                                    <InputShell $hasError={!!methods.formState.errors.street}>
                                        <BareInput
                                            id="company-street"
                                            {...methods.register('street')}
                                            placeholder={t.customers.form.company.streetPlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.street && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.street.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="company-city">
                                        {t.customers.form.company.city}
                                    </FieldLabel>
                                    <InputShell $hasError={!!methods.formState.errors.city}>
                                        <BareInput
                                            id="company-city"
                                            {...methods.register('city')}
                                            placeholder={t.customers.form.company.cityPlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.city && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.city.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="company-postalCode">
                                        {t.customers.form.company.postalCode}
                                    </FieldLabel>
                                    <InputShell $hasError={!!methods.formState.errors.postalCode}>
                                        <BareInput
                                            id="company-postalCode"
                                            {...methods.register('postalCode')}
                                            placeholder={t.customers.form.company.postalCodePlaceholder}
                                        />
                                    </InputShell>
                                    {methods.formState.errors.postalCode && (
                                        <FormErrorMsg>
                                            {methods.formState.errors.postalCode.message}
                                        </FormErrorMsg>
                                    )}
                                </FormField>
                            </FormGrid>
                        </FormSection>
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
