import { useState } from 'react';
import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { FormGrid, FieldGroup, Label, Input, ErrorMessage } from '@/common/components/Form';
import { Divider } from '@/common/components/Divider';
import { Toggle } from '@/common/components/Toggle';
import { EditableServicesTable } from './EditableServicesTable';
import { t } from '@/common/i18n';
import type { CheckInFormData, ServiceLineItem } from '../types';

const StepContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        gap: ${props => props.theme.spacing.xl};
    }
`;

const SectionTitle = styled.h3`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.md};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    svg {
        width: 24px;
        height: 24px;
        color: ${props => props.theme.colors.primary};
    }
`;

interface VerificationStepProps {
    formData: CheckInFormData;
    errors: Record<string, string>;
    onChange: (updates: Partial<CheckInFormData>) => void;
    onServicesChange: (services: ServiceLineItem[]) => void;
}

export const VerificationStep = ({ formData, errors, onChange, onServicesChange }: VerificationStepProps) => {
    const [includeHomeAddress, setIncludeHomeAddress] = useState(!!formData.homeAddress);
    const [includeCompany, setIncludeCompany] = useState(!!formData.company);

    const handleCustomerChange = (field: string, value: string) => {
        onChange({
            customerData: {
                ...formData.customerData,
                [field]: value,
            },
        });
    };

    const handleVehicleChange = (field: string, value: string) => {
        onChange({
            vehicleData: {
                ...formData.vehicleData,
                [field]: value,
            },
        });
    };

    const handleHomeAddressToggle = (enabled: boolean) => {
        setIncludeHomeAddress(enabled);
        if (!enabled) {
            onChange({ homeAddress: null });
        } else {
            onChange({
                homeAddress: {
                    street: '',
                    city: '',
                    postalCode: '',
                    country: 'Polska',
                },
            });
        }
    };

    const handleHomeAddressChange = (field: string, value: string) => {
        onChange({
            homeAddress: {
                ...formData.homeAddress!,
                [field]: value,
            },
        });
    };

    const handleCompanyToggle = (enabled: boolean) => {
        setIncludeCompany(enabled);
        if (!enabled) {
            onChange({ company: null });
        } else {
            onChange({
                company: {
                    name: '',
                    nip: '',
                    regon: '',
                    address: {
                        street: '',
                        city: '',
                        postalCode: '',
                        country: 'Polska',
                    },
                },
            });
        }
    };

    const handleCompanyChange = (field: string, value: string) => {
        onChange({
            company: {
                ...formData.company!,
                [field]: value,
            },
        });
    };

    const handleCompanyAddressChange = (field: string, value: string) => {
        onChange({
            company: {
                ...formData.company!,
                address: {
                    ...formData.company!.address,
                    [field]: value,
                },
            },
        });
    };

    return (
        <StepContainer>
            <Card>
                <CardHeader>
                    <CardTitle>{t.checkin.verification.title}</CardTitle>
                </CardHeader>

                <SectionTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t.checkin.verification.customerSection}
                </SectionTitle>

                <FormGrid>
                    <FieldGroup>
                        <Label>{t.checkin.verification.firstName}</Label>
                        <Input
                            value={formData.customerData.firstName}
                            onChange={(e) => handleCustomerChange('firstName', e.target.value)}
                        />
                        {errors.firstName && <ErrorMessage>{errors.firstName}</ErrorMessage>}
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.verification.lastName}</Label>
                        <Input
                            value={formData.customerData.lastName}
                            onChange={(e) => handleCustomerChange('lastName', e.target.value)}
                        />
                        {errors.lastName && <ErrorMessage>{errors.lastName}</ErrorMessage>}
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.verification.phone}</Label>
                        <Input
                            value={formData.customerData.phone}
                            onChange={(e) => handleCustomerChange('phone', e.target.value)}
                        />
                        {errors.phone && <ErrorMessage>{errors.phone}</ErrorMessage>}
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.verification.email}</Label>
                        <Input
                            type="email"
                            value={formData.customerData.email}
                            onChange={(e) => handleCustomerChange('email', e.target.value)}
                        />
                        {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
                    </FieldGroup>
                </FormGrid>

                <Divider />

                <Toggle
                    checked={includeHomeAddress}
                    onChange={handleHomeAddressToggle}
                    label={t.customers.form.includeHomeAddress}
                />

                {includeHomeAddress && formData.homeAddress && (
                    <>
                        <SectionTitle>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            {t.customers.form.homeAddress.title}
                        </SectionTitle>

                        <FormGrid>
                            <FieldGroup style={{ gridColumn: '1 / -1' }}>
                                <Label>{t.customers.form.homeAddress.street}</Label>
                                <Input
                                    value={formData.homeAddress.street}
                                    onChange={(e) => handleHomeAddressChange('street', e.target.value)}
                                    placeholder={t.customers.form.homeAddress.streetPlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.homeAddress.city}</Label>
                                <Input
                                    value={formData.homeAddress.city}
                                    onChange={(e) => handleHomeAddressChange('city', e.target.value)}
                                    placeholder={t.customers.form.homeAddress.cityPlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.homeAddress.postalCode}</Label>
                                <Input
                                    value={formData.homeAddress.postalCode}
                                    onChange={(e) => handleHomeAddressChange('postalCode', e.target.value)}
                                    placeholder={t.customers.form.homeAddress.postalCodePlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.homeAddress.country}</Label>
                                <Input
                                    value={formData.homeAddress.country}
                                    onChange={(e) => handleHomeAddressChange('country', e.target.value)}
                                    placeholder={t.customers.form.homeAddress.countryPlaceholder}
                                />
                            </FieldGroup>
                        </FormGrid>
                    </>
                )}

                <Divider />

                <Toggle
                    checked={includeCompany}
                    onChange={handleCompanyToggle}
                    label={t.customers.form.includeCompany}
                />

                {includeCompany && formData.company && (
                    <>
                        <SectionTitle>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {t.customers.form.company.title}
                        </SectionTitle>

                        <FormGrid>
                            <FieldGroup style={{ gridColumn: '1 / -1' }}>
                                <Label>{t.customers.form.company.name}</Label>
                                <Input
                                    value={formData.company.name}
                                    onChange={(e) => handleCompanyChange('name', e.target.value)}
                                    placeholder={t.customers.form.company.namePlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.company.nip}</Label>
                                <Input
                                    value={formData.company.nip}
                                    onChange={(e) => handleCompanyChange('nip', e.target.value)}
                                    placeholder={t.customers.form.company.nipPlaceholder}
                                />
                                {errors.nip && <ErrorMessage>{errors.nip}</ErrorMessage>}
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.company.regon}</Label>
                                <Input
                                    value={formData.company.regon}
                                    onChange={(e) => handleCompanyChange('regon', e.target.value)}
                                    placeholder={t.customers.form.company.regonPlaceholder}
                                />
                                {errors.regon && <ErrorMessage>{errors.regon}</ErrorMessage>}
                            </FieldGroup>

                            <FieldGroup style={{ gridColumn: '1 / -1' }}>
                                <Label>{t.customers.form.company.street}</Label>
                                <Input
                                    value={formData.company.address.street}
                                    onChange={(e) => handleCompanyAddressChange('street', e.target.value)}
                                    placeholder={t.customers.form.company.streetPlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.company.city}</Label>
                                <Input
                                    value={formData.company.address.city}
                                    onChange={(e) => handleCompanyAddressChange('city', e.target.value)}
                                    placeholder={t.customers.form.company.cityPlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.company.postalCode}</Label>
                                <Input
                                    value={formData.company.address.postalCode}
                                    onChange={(e) => handleCompanyAddressChange('postalCode', e.target.value)}
                                    placeholder={t.customers.form.company.postalCodePlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.company.country}</Label>
                                <Input
                                    value={formData.company.address.country}
                                    onChange={(e) => handleCompanyAddressChange('country', e.target.value)}
                                    placeholder={t.customers.form.company.countryPlaceholder}
                                />
                            </FieldGroup>
                        </FormGrid>
                    </>
                )}

                <Divider />

                <SectionTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    {t.checkin.verification.vehicleSection}
                </SectionTitle>

                <FormGrid>
                    <FieldGroup>
                        <Label>{t.checkin.verification.brand}</Label>
                        <Input
                            value={formData.vehicleData.brand}
                            onChange={(e) => handleVehicleChange('brand', e.target.value)}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.verification.model}</Label>
                        <Input
                            value={formData.vehicleData.model}
                            onChange={(e) => handleVehicleChange('model', e.target.value)}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.verification.licensePlate}</Label>
                        <Input
                            value={formData.vehicleData.licensePlate}
                            onChange={(e) => handleVehicleChange('licensePlate', e.target.value)}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.verification.vin}</Label>
                        <Input
                            value={formData.vehicleData.vin}
                            onChange={(e) => handleVehicleChange('vin', e.target.value.toUpperCase())}
                            placeholder={t.checkin.verification.vinPlaceholder}
                            maxLength={17}
                        />
                        {errors.vin && <ErrorMessage>{errors.vin}</ErrorMessage>}
                    </FieldGroup>
                </FormGrid>

                <Divider />

                <SectionTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Usługi
                </SectionTitle>

                <EditableServicesTable
                    services={formData.services}
                    onChange={onServicesChange}
                />
            </Card>
        </StepContainer>
    );
};