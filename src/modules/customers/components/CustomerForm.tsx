import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { CreateCustomerFormData } from '../utils/customerValidation';
import { t } from '@/common/i18n';
import { PhoneInputField } from '@/common/components/PhoneInputField';
import { NipInput } from './NipInput';
import {
    FormGrid,
    FormField,
    FieldLabel,
    InputShell,
    InputShellTextArea,
    BareInput,
    BareTextArea,
    FormErrorMsg,
    FormTabBar,
    FormTabBtn,
    FormTabPanel,
} from '@/common/components/Form';

type TabId = 'basic' | 'address' | 'company';

export const CustomerForm = () => {
    const [activeTab, setActiveTab] = useState<TabId>('basic');

    const {
        register,
        formState: { errors },
    } = useFormContext<CreateCustomerFormData>();

    return (
        <>
            <FormTabBar>
                <FormTabBtn
                    type="button"
                    $active={activeTab === 'basic'}
                    onClick={() => setActiveTab('basic')}
                >
                    Dane podstawowe
                </FormTabBtn>
                <FormTabBtn
                    type="button"
                    $active={activeTab === 'address'}
                    onClick={() => setActiveTab('address')}
                >
                    Adres zamieszkania
                </FormTabBtn>
                <FormTabBtn
                    type="button"
                    $active={activeTab === 'company'}
                    onClick={() => setActiveTab('company')}
                >
                    Dane firmy
                </FormTabBtn>
            </FormTabBar>

            {/* ── Dane podstawowe ───────────────────────────────────────────
                Always rendered (CSS hidden) so RHF retains field values.   */}
            <FormTabPanel $active={activeTab === 'basic'}>
                <FormGrid>
                    <FormField>
                        <FieldLabel htmlFor="firstName">{t.customers.form.firstName}</FieldLabel>
                        <InputShell $hasError={!!errors.firstName}>
                            <BareInput
                                id="firstName"
                                autoComplete="new-password"
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
                                autoComplete="new-password"
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
                                autoComplete="new-password"
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

                    <FormField $fullWidth>
                        <FieldLabel htmlFor="notes">{t.customers.form.notes.label}</FieldLabel>
                        <InputShellTextArea $hasError={!!errors.notes}>
                            <BareTextArea
                                id="notes"
                                autoComplete="new-password"
                                {...register('notes')}
                                placeholder={t.customers.form.notes.placeholder}
                            />
                        </InputShellTextArea>
                        {errors.notes && (
                            <FormErrorMsg>{errors.notes.message}</FormErrorMsg>
                        )}
                    </FormField>
                </FormGrid>
            </FormTabPanel>

            {/* ── Adres zamieszkania ──────────────────────────────────────── */}
            <FormTabPanel $active={activeTab === 'address'}>
                <FormGrid>
                    <FormField $fullWidth>
                        <FieldLabel htmlFor="homeAddress.street">
                            {t.customers.form.homeAddress.street}
                        </FieldLabel>
                        <InputShell $hasError={!!errors.homeAddress?.street}>
                            <BareInput
                                id="homeAddress.street"
                                autoComplete="new-password"
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
                                autoComplete="new-password"
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
                                autoComplete="new-password"
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
                                autoComplete="new-password"
                                {...register('homeAddress.country')}
                                placeholder={t.customers.form.homeAddress.countryPlaceholder}
                            />
                        </InputShell>
                        {errors.homeAddress?.country && (
                            <FormErrorMsg>{errors.homeAddress.country.message}</FormErrorMsg>
                        )}
                    </FormField>
                </FormGrid>
            </FormTabPanel>

            {/* ── Dane firmy ─────────────────────────────────────────────── */}
            <FormTabPanel $active={activeTab === 'company'}>
                <FormGrid>
                    <FormField $fullWidth>
                        <FieldLabel htmlFor="company.name">
                            {t.customers.form.company.name}
                        </FieldLabel>
                        <InputShell $hasError={!!errors.company?.name}>
                            <BareInput
                                id="company.name"
                                autoComplete="new-password"
                                {...register('company.name')}
                                placeholder={t.customers.form.company.namePlaceholder}
                            />
                        </InputShell>
                        {errors.company?.name && (
                            <FormErrorMsg>{errors.company.name.message}</FormErrorMsg>
                        )}
                    </FormField>

                    <NipInput />

                    <FormField>
                        <FieldLabel htmlFor="company.regon">
                            {t.customers.form.company.regon}
                        </FieldLabel>
                        <InputShell $hasError={!!errors.company?.regon}>
                            <BareInput
                                id="company.regon"
                                autoComplete="new-password"
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
                                autoComplete="new-password"
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
                                autoComplete="new-password"
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
                                autoComplete="new-password"
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
                                autoComplete="new-password"
                                {...register('company.address.country')}
                                placeholder={t.customers.form.company.countryPlaceholder}
                            />
                        </InputShell>
                        {errors.company?.address?.country && (
                            <FormErrorMsg>{errors.company.address.country.message}</FormErrorMsg>
                        )}
                    </FormField>
                </FormGrid>
            </FormTabPanel>
        </>
    );
};
