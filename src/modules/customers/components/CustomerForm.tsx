import { useFormContext } from 'react-hook-form';
import { User, Home, Building2, FileText } from 'lucide-react';
import type { CreateCustomerFormData } from '../utils/customerValidation';
import { t } from '@/common/i18n';
import { PhoneInputField } from '@/common/components/PhoneInputField';
import {
    FormGrid,
    FormField,
    FieldLabel,
    InputShell,
    InputShellTextArea,
    BareInput,
    BareTextArea,
    FormErrorMsg,
    FormSection,
    SectionHeader,
    ToggleCard,
    ToggleSwitch,
    ToggleContent,
    ToggleTitle,
    ToggleDescription,
    HiddenCheckbox,
    ExpandableSection,
    ExpandableContent,
} from '@/common/components/Form';

interface CustomerFormProps {
    includeCompany: boolean;
    onIncludeCompanyChange: (value: boolean) => void;
    includeHomeAddress: boolean;
    onIncludeHomeAddressChange: (value: boolean) => void;
}

export const CustomerForm = ({
    includeCompany,
    onIncludeCompanyChange,
    includeHomeAddress,
    onIncludeHomeAddressChange,
}: CustomerFormProps) => {
    const {
        register,
        formState: { errors },
    } = useFormContext<CreateCustomerFormData>();

    return (
        <>
            {/* ── Dane osobowe ─────────────────────────────────────────────── */}
            <FormSection>
                <SectionHeader
                    icon={<User />}
                    iconColor="#6366f1"
                    title={t.customers.form.personalInfo}
                    subtitle="Podstawowe dane kontaktowe klienta"
                />

                <FormGrid>
                    <FormField>
                        <FieldLabel htmlFor="firstName">{t.customers.form.firstName}</FieldLabel>
                        <InputShell $hasError={!!errors.firstName}>
                            <BareInput
                                id="firstName"
                                {...register('firstName')}
                                placeholder={t.customers.form.firstNamePlaceholder}
                            />
                        </InputShell>
                        {errors.firstName && (
                            <FormErrorMsg>{errors.firstName.message}</FormErrorMsg>
                        )}
                    </FormField>

                    <FormField>
                        <FieldLabel htmlFor="lastName">{t.customers.form.lastName}</FieldLabel>
                        <InputShell $hasError={!!errors.lastName}>
                            <BareInput
                                id="lastName"
                                {...register('lastName')}
                                placeholder={t.customers.form.lastNamePlaceholder}
                            />
                        </InputShell>
                        {errors.lastName && (
                            <FormErrorMsg>{errors.lastName.message}</FormErrorMsg>
                        )}
                    </FormField>

                    <FormField>
                        <FieldLabel htmlFor="email">{t.customers.form.email}</FieldLabel>
                        <InputShell $hasError={!!errors.email}>
                            <BareInput
                                id="email"
                                type="email"
                                {...register('email')}
                                placeholder={t.customers.form.emailPlaceholder}
                            />
                        </InputShell>
                        {errors.email && (
                            <FormErrorMsg>{errors.email.message}</FormErrorMsg>
                        )}
                    </FormField>

                    <FormField>
                        <FieldLabel htmlFor="phone">{t.customers.form.phone}</FieldLabel>
                        <PhoneInputField
                            name="phone"
                            id="phone"
                            placeholder={t.customers.form.phonePlaceholder}
                        />
                    </FormField>
                </FormGrid>
            </FormSection>

            {/* ── Adres zamieszkania (opcjonalny) ──────────────────────────── */}
            <FormSection>
                <ToggleCard $isActive={includeHomeAddress}>
                    <HiddenCheckbox
                        type="checkbox"
                        checked={includeHomeAddress}
                        onChange={e => onIncludeHomeAddressChange(e.target.checked)}
                    />
                    <ToggleSwitch $isActive={includeHomeAddress} />
                    <ToggleContent>
                        <ToggleTitle>{t.customers.form.includeHomeAddress}</ToggleTitle>
                        <ToggleDescription>Adres zamieszkania do korespondencji</ToggleDescription>
                    </ToggleContent>
                </ToggleCard>

                <ExpandableSection $isExpanded={includeHomeAddress}>
                    <ExpandableContent>
                        <SectionHeader
                            icon={<Home />}
                            iconColor="#10b981"
                            title={t.customers.form.homeAddress.title}
                            subtitle="Dane adresowe klienta"
                        />

                        <FormGrid>
                            <FormField $fullWidth>
                                <FieldLabel htmlFor="homeAddress.street">
                                    {t.customers.form.homeAddress.street}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.homeAddress?.street}>
                                    <BareInput
                                        id="homeAddress.street"
                                        {...register('homeAddress.street')}
                                        placeholder={t.customers.form.homeAddress.streetPlaceholder}
                                    />
                                </InputShell>
                                {errors.homeAddress?.street && (
                                    <FormErrorMsg>{errors.homeAddress.street.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="homeAddress.city">
                                    {t.customers.form.homeAddress.city}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.homeAddress?.city}>
                                    <BareInput
                                        id="homeAddress.city"
                                        {...register('homeAddress.city')}
                                        placeholder={t.customers.form.homeAddress.cityPlaceholder}
                                    />
                                </InputShell>
                                {errors.homeAddress?.city && (
                                    <FormErrorMsg>{errors.homeAddress.city.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="homeAddress.postalCode">
                                    {t.customers.form.homeAddress.postalCode}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.homeAddress?.postalCode}>
                                    <BareInput
                                        id="homeAddress.postalCode"
                                        {...register('homeAddress.postalCode')}
                                        placeholder={t.customers.form.homeAddress.postalCodePlaceholder}
                                    />
                                </InputShell>
                                {errors.homeAddress?.postalCode && (
                                    <FormErrorMsg>{errors.homeAddress.postalCode.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="homeAddress.country">
                                    {t.customers.form.homeAddress.country}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.homeAddress?.country}>
                                    <BareInput
                                        id="homeAddress.country"
                                        {...register('homeAddress.country')}
                                        placeholder={t.customers.form.homeAddress.countryPlaceholder}
                                    />
                                </InputShell>
                                {errors.homeAddress?.country && (
                                    <FormErrorMsg>{errors.homeAddress.country.message}</FormErrorMsg>
                                )}
                            </FormField>
                        </FormGrid>
                    </ExpandableContent>
                </ExpandableSection>
            </FormSection>

            {/* ── Firma (opcjonalna) ────────────────────────────────────────── */}
            <FormSection>
                <ToggleCard $isActive={includeCompany}>
                    <HiddenCheckbox
                        type="checkbox"
                        checked={includeCompany}
                        onChange={e => onIncludeCompanyChange(e.target.checked)}
                    />
                    <ToggleSwitch $isActive={includeCompany} />
                    <ToggleContent>
                        <ToggleTitle>{t.customers.form.includeCompany}</ToggleTitle>
                        <ToggleDescription>Dane firmy do faktur i dokumentów</ToggleDescription>
                    </ToggleContent>
                </ToggleCard>

                <ExpandableSection $isExpanded={includeCompany}>
                    <ExpandableContent>
                        <SectionHeader
                            icon={<Building2 />}
                            iconColor="#f59e0b"
                            title={t.customers.form.company.title}
                            subtitle="Dane rejestrowe firmy"
                        />

                        <FormGrid>
                            <FormField $fullWidth>
                                <FieldLabel htmlFor="company.name">
                                    {t.customers.form.company.name}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.company?.name}>
                                    <BareInput
                                        id="company.name"
                                        {...register('company.name')}
                                        placeholder={t.customers.form.company.namePlaceholder}
                                    />
                                </InputShell>
                                {errors.company?.name && (
                                    <FormErrorMsg>{errors.company.name.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="company.nip">
                                    {t.customers.form.company.nip}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.company?.nip}>
                                    <BareInput
                                        id="company.nip"
                                        {...register('company.nip')}
                                        placeholder={t.customers.form.company.nipPlaceholder}
                                    />
                                </InputShell>
                                {errors.company?.nip && (
                                    <FormErrorMsg>{errors.company.nip.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="company.regon">
                                    {t.customers.form.company.regon}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.company?.regon}>
                                    <BareInput
                                        id="company.regon"
                                        {...register('company.regon')}
                                        placeholder={t.customers.form.company.regonPlaceholder}
                                    />
                                </InputShell>
                                {errors.company?.regon && (
                                    <FormErrorMsg>{errors.company.regon.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField $fullWidth>
                                <FieldLabel htmlFor="company.address.street">
                                    {t.customers.form.company.street}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.company?.address?.street}>
                                    <BareInput
                                        id="company.address.street"
                                        {...register('company.address.street')}
                                        placeholder={t.customers.form.company.streetPlaceholder}
                                    />
                                </InputShell>
                                {errors.company?.address?.street && (
                                    <FormErrorMsg>{errors.company.address.street.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="company.address.city">
                                    {t.customers.form.company.city}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.company?.address?.city}>
                                    <BareInput
                                        id="company.address.city"
                                        {...register('company.address.city')}
                                        placeholder={t.customers.form.company.cityPlaceholder}
                                    />
                                </InputShell>
                                {errors.company?.address?.city && (
                                    <FormErrorMsg>{errors.company.address.city.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="company.address.postalCode">
                                    {t.customers.form.company.postalCode}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.company?.address?.postalCode}>
                                    <BareInput
                                        id="company.address.postalCode"
                                        {...register('company.address.postalCode')}
                                        placeholder={t.customers.form.company.postalCodePlaceholder}
                                    />
                                </InputShell>
                                {errors.company?.address?.postalCode && (
                                    <FormErrorMsg>{errors.company.address.postalCode.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="company.address.country">
                                    {t.customers.form.company.country}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.company?.address?.country}>
                                    <BareInput
                                        id="company.address.country"
                                        {...register('company.address.country')}
                                        placeholder={t.customers.form.company.countryPlaceholder}
                                    />
                                </InputShell>
                                {errors.company?.address?.country && (
                                    <FormErrorMsg>{errors.company.address.country.message}</FormErrorMsg>
                                )}
                            </FormField>
                        </FormGrid>
                    </ExpandableContent>
                </ExpandableSection>
            </FormSection>

            {/* ── Notatki ──────────────────────────────────────────────────── */}
            <FormSection>
                <SectionHeader
                    icon={<FileText />}
                    iconColor="#8b5cf6"
                    title={t.customers.form.notes.title}
                    subtitle="Dodatkowe uwagi i informacje"
                />

                <FormGrid>
                    <FormField $fullWidth>
                        <FieldLabel htmlFor="notes">{t.customers.form.notes.label}</FieldLabel>
                        <InputShellTextArea $hasError={!!errors.notes}>
                            <BareTextArea
                                id="notes"
                                {...register('notes')}
                                placeholder={t.customers.form.notes.placeholder}
                            />
                        </InputShellTextArea>
                        {errors.notes && (
                            <FormErrorMsg>{errors.notes.message}</FormErrorMsg>
                        )}
                    </FormField>
                </FormGrid>
            </FormSection>
        </>
    );
};
