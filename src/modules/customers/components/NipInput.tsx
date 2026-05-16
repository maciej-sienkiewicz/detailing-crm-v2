import { useFormContext, useController } from 'react-hook-form';
import { NipInputWithGus, type CompanyInfoResponse } from '@/common/components/NipInputWithGus';
import type { CreateCustomerFormData } from '../utils/customerValidation';
import { t } from '@/common/i18n';
import { FormField, FieldLabel, FormErrorMsg } from '@/common/components/Form';

export const NipInput = () => {
    const { control, setValue, formState: { errors } } = useFormContext<CreateCustomerFormData>();
    const { field } = useController({ control, name: 'company.nip' });

    const handleFetch = (data: CompanyInfoResponse) => {
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
    };

    return (
        <FormField>
            <FieldLabel htmlFor="company.nip">
                {t.customers.form.company.nip}
            </FieldLabel>
            <NipInputWithGus
                id="company.nip"
                value={field.value ?? ''}
                onChange={field.onChange}
                onFetch={handleFetch}
                hasError={!!errors.company?.nip}
                placeholder={t.customers.form.company.nipPlaceholder}
            />
            {errors.company?.nip && (
                <FormErrorMsg>{errors.company.nip.message}</FormErrorMsg>
            )}
        </FormField>
    );
};
