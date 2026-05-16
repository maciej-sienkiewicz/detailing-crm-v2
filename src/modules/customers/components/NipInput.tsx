import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import styled from 'styled-components';
import { Building2 } from 'lucide-react';
import { gusApi } from '@/modules/gus/api/gusApi';
import type { CreateCustomerFormData } from '../utils/customerValidation';
import { t } from '@/common/i18n';
import {
    InputShell,
    BareInput,
    FormErrorMsg,
    FieldLabel,
    FormField,
} from '@/common/components/Form';

const GusBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px;
    height: 100%;
    border: none;
    border-left: 1px solid #e2e8f0;
    background: none;
    font-size: 12px;
    font-weight: 600;
    color: var(--brand-primary);
    cursor: pointer;
    white-space: nowrap;
    border-radius: 0 10px 10px 0;
    transition: background 0.15s ease;
    flex-shrink: 0;

    &:hover:not(:disabled) {
        background: #f0f9ff;
    }

    &:disabled {
        color: #94a3b8;
        cursor: not-allowed;
    }
`;

export const NipInput = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [gusError, setGusError] = useState<string | null>(null);

    const {
        register,
        getValues,
        setValue,
        formState: { errors },
    } = useFormContext<CreateCustomerFormData>();

    const handleFetch = async () => {
        const nip = getValues('company.nip')?.replace(/[\s-]/g, '') ?? '';
        if (!nip) return;

        setIsLoading(true);
        setGusError(null);

        try {
            const data = await gusApi.getCompanyByNip(nip);

            setValue('company.name', data.name, { shouldValidate: true });
            setValue('company.regon', data.regon, { shouldValidate: true });

            const { street, buildingNumber, apartmentNumber, city, postalCode } = data.address;
            const streetLine = [street, buildingNumber].filter(Boolean).join(' ') +
                (apartmentNumber ? `/${apartmentNumber}` : '');
            const formattedPostal = postalCode?.replace(/^(\d{2})(\d{3})$/, '$1-$2') ?? postalCode ?? '';

            setValue('company.address.street', streetLine || '', { shouldValidate: true });
            setValue('company.address.city', city ?? '', { shouldValidate: true });
            setValue('company.address.postalCode', formattedPostal, { shouldValidate: true });
            setValue('company.address.country', data.address.country ?? '', { shouldValidate: true });
        } catch {
            setGusError('Nie udało się pobrać danych z GUS. Sprawdź NIP i spróbuj ponownie.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FormField>
            <FieldLabel htmlFor="company.nip">
                {t.customers.form.company.nip}
            </FieldLabel>
            <InputShell $hasError={!!errors.company?.nip}>
                <BareInput
                    id="company.nip"
                    autoComplete="new-password"
                    {...register('company.nip')}
                    placeholder={t.customers.form.company.nipPlaceholder}
                />
                <GusBtn
                    type="button"
                    onClick={handleFetch}
                    disabled={isLoading}
                    title="Pobierz dane firmy z GUS"
                >
                    <Building2 size={13} />
                    {isLoading ? 'Pobieranie…' : 'Pobierz z GUS'}
                </GusBtn>
            </InputShell>
            {errors.company?.nip && (
                <FormErrorMsg>{errors.company.nip.message}</FormErrorMsg>
            )}
            {gusError && <FormErrorMsg>{gusError}</FormErrorMsg>}
        </FormField>
    );
};
