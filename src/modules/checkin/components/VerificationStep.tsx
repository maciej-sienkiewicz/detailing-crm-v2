import { useState } from 'react';
import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { FormGrid, FieldGroup, Label, Input, TextArea, ErrorMessage } from '@/common/components/Form';
import { Divider } from '@/common/components/Divider';
import { Button } from '@/common/components/Button';
import { Toggle } from '@/common/components/Toggle';
import { EditableServicesTable } from './EditableServicesTable';
import { CustomerModal } from '@/modules/appointments/components/CustomerModal';
import { CustomerDetailsModal } from './CustomerDetailsModal';
import { VehicleSearchModal, type SelectedVehicle } from './VehicleSearchModal';
import { VehicleDetailsModal } from './VehicleDetailsModal';
import type { SelectedCustomer, AppointmentColor } from '@/modules/appointments/types';
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

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${props => props.theme.spacing.md};
    gap: ${props => props.theme.spacing.md};
`;

const SectionTitleWithActions = styled(SectionTitle)`
    margin-bottom: 0;
    flex: 1;
`;

const SubtleButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    align-items: center;
`;

const SubtleButton = styled.button`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.primary};
    background: transparent;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    white-space: nowrap;

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
        border-color: ${props => props.theme.colors.primary};
    }

    &:active {
        transform: scale(0.98);
    }
`;

const ReadOnlyField = styled.div`
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
`;

const ReadOnlyLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const ReadOnlyValue = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const CustomerSelectButton = styled(Button)`
    width: 100%;
    justify-content: center;
    padding: ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.md};
`;

const ColorSelectWrapper = styled.div`
    position: relative;
`;

const ColorDot = styled.div<{ $color: string }>`
    position: absolute;
    left: ${props => props.theme.spacing.md};
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: ${props => props.$color};
    border: 2px solid ${props => props.theme.colors.border};
    box-shadow: ${props => props.theme.shadows.sm};
    pointer-events: none;
    z-index: 1;
`;

const ColorSelect = styled.select`
    width: 100%;
    padding: ${props => props.theme.spacing.md};
    padding-left: 48px;
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    background-color: ${props => props.theme.colors.surface};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    font-weight: ${props => props.theme.fontWeights.medium};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

interface VerificationStepProps {
    formData: CheckInFormData;
    errors: Record<string, string>;
    onChange: (updates: Partial<CheckInFormData>) => void;
    onServicesChange: (services: ServiceLineItem[]) => void;
    colors: AppointmentColor[];
}

export const VerificationStep    = ({ formData, errors, onChange, onServicesChange, colors }: VerificationStepProps) => {
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isCustomerDetailsModalOpen, setIsCustomerDetailsModalOpen] = useState(false);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [isVehicleDetailsModalOpen, setIsVehicleDetailsModalOpen] = useState(false);

    const handleCustomerDetailsSave = (data: {
        customerData: {
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
        };
        homeAddress: CheckInFormData['homeAddress'];
        company: CheckInFormData['company'];
    }) => {
        onChange({
            customerData: {
                ...formData.customerData,
                ...data.customerData,
            },
            homeAddress: data.homeAddress,
            company: data.company,
        });
    };

    const handleCustomerSelect = (customer: SelectedCustomer) => {
        // Ustawienie pełnych danych klienta
        onChange({
            customerData: {
                id: customer.id || '',
                firstName: customer.firstName || '',
                lastName: customer.lastName || '',
                phone: customer.phone || '',
                email: customer.email || '',
            },
            hasFullCustomerData: true,
            isNewCustomer: customer.isNew || false,
        });
        setIsCustomerModalOpen(false);
    };

    const handleVehicleSelect = (vehicle: SelectedVehicle) => {
        onChange({
            vehicleData: {
                id: vehicle.id || `temp-${Date.now()}`,
                brand: vehicle.brand,
                model: vehicle.model,
                yearOfProduction: vehicle.yearOfProduction || new Date().getFullYear(),
                licensePlate: vehicle.licensePlate || '',
                vin: vehicle.vin,
                color: vehicle.color,
                paintType: vehicle.paintType,
            },
            isNewVehicle: vehicle.isNew || false,
        });
        setIsVehicleModalOpen(false);
    };

    const handleVehicleDetailsSave = (data: {
        vehicleData: {
            brand: string;
            model: string;
            yearOfProduction?: number;
            licensePlate: string;
            color?: string;
            paintType?: string;
        };
    }) => {
        onChange({
            vehicleData: {
                id: formData.vehicleData?.id || `temp-${Date.now()}`,
                brand: data.vehicleData.brand,
                model: data.vehicleData.model,
                yearOfProduction: data.vehicleData.yearOfProduction,
                licensePlate: data.vehicleData.licensePlate || '',
                color: data.vehicleData.color,
                paintType: data.vehicleData.paintType,
            },
        });
        setIsVehicleDetailsModalOpen(false);
    };

    return (
        <StepContainer>
            <Card>
                <CardHeader>
                    <CardTitle>{t.checkin.verification.title}</CardTitle>
                </CardHeader>

                {/* Sekcja: Kalendarz (data rozpoczęcia, data zakończenia, kolor) */}
                <SectionTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Kalendarz
                </SectionTitle>
                <FormGrid $columns={3}>
                    <FieldGroup>
                        <Label>Data rozpoczęcia</Label>
                        <Input
                            type="datetime-local"
                            value={formData.visitStartAt ? formData.visitStartAt : ''}
                            onChange={(e) => onChange({ visitStartAt: e.target.value })}
                        />
                    </FieldGroup>
                    <FieldGroup>
                        <Label>Data zakończenia</Label>
                        <Input
                            type="datetime-local"
                            value={formData.visitEndAt ? formData.visitEndAt : ''}
                            onChange={(e) => onChange({ visitEndAt: e.target.value })}
                        />
                    </FieldGroup>
                    <FieldGroup>
                        <Label>Kolor w kalendarzu</Label>
                        <ColorSelectWrapper>
                            <ColorDot
                                $color={colors.find(c => c.id === formData.appointmentColorId)?.hexColor || '#cccccc'}
                            />
                            <ColorSelect
                                value={formData.appointmentColorId}
                                onChange={(e) => onChange({ appointmentColorId: e.target.value })}
                            >
                                {colors.map((color) => (
                                    <option key={color.id} value={color.id}>
                                        {color.name}
                                    </option>
                                ))}
                            </ColorSelect>
                        </ColorSelectWrapper>
                    </FieldGroup>
                </FormGrid>

                <Divider />

                {formData.hasFullCustomerData ? (
                    <>
                        <SectionHeader>
                            <SectionTitleWithActions>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {t.checkin.verification.customerSection}
                            </SectionTitleWithActions>
                            <SubtleButtonGroup>
                                <SubtleButton onClick={() => setIsCustomerDetailsModalOpen(true)}>
                                    Edytuj dane
                                </SubtleButton>
                                <SubtleButton onClick={() => setIsCustomerModalOpen(true)}>
                                    Zmień klienta
                                </SubtleButton>
                            </SubtleButtonGroup>
                        </SectionHeader>

                        <FormGrid>
                            <FieldGroup>
                                <ReadOnlyField>
                                    <ReadOnlyLabel>{t.checkin.verification.firstName}</ReadOnlyLabel>
                                    <ReadOnlyValue>{formData.customerData.firstName}</ReadOnlyValue>
                                </ReadOnlyField>
                            </FieldGroup>

                            <FieldGroup>
                                <ReadOnlyField>
                                    <ReadOnlyLabel>{t.checkin.verification.lastName}</ReadOnlyLabel>
                                    <ReadOnlyValue>{formData.customerData.lastName}</ReadOnlyValue>
                                </ReadOnlyField>
                            </FieldGroup>

                            <FieldGroup>
                                <ReadOnlyField>
                                    <ReadOnlyLabel>{t.checkin.verification.phone}</ReadOnlyLabel>
                                    <ReadOnlyValue>{formData.customerData.phone || '-'}</ReadOnlyValue>
                                </ReadOnlyField>
                            </FieldGroup>

                            <FieldGroup>
                                <ReadOnlyField>
                                    <ReadOnlyLabel>{t.checkin.verification.email}</ReadOnlyLabel>
                                    <ReadOnlyValue>{formData.customerData.email || '-'}</ReadOnlyValue>
                                </ReadOnlyField>
                            </FieldGroup>
                        </FormGrid>
                    </>
                ) : (
                    <>
                        <SectionTitle>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {t.checkin.verification.customerSection}
                        </SectionTitle>
                        <CustomerSelectButton
                            $variant="primary"
                            onClick={() => setIsCustomerModalOpen(true)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px', height: '20px', marginRight: '8px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Dodaj lub wyszukaj klienta
                        </CustomerSelectButton>
                    </>
                )}

                <Divider />

                {formData.vehicleData ? (
                    <>
                        <SectionHeader>
                            <SectionTitleWithActions>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                                {t.checkin.verification.vehicleSection}
                            </SectionTitleWithActions>
                            <SubtleButtonGroup>
                                <SubtleButton onClick={() => setIsVehicleDetailsModalOpen(true)}>
                                    Edytuj dane
                                </SubtleButton>
                                <SubtleButton onClick={() => setIsVehicleModalOpen(true)}>
                                    Zmień pojazd
                                </SubtleButton>
                            </SubtleButtonGroup>
                        </SectionHeader>

                        <FormGrid>
                            <FieldGroup>
                                <ReadOnlyField>
                                    <ReadOnlyLabel>{t.checkin.verification.brand}</ReadOnlyLabel>
                                    <ReadOnlyValue>{formData.vehicleData.brand}</ReadOnlyValue>
                                </ReadOnlyField>
                            </FieldGroup>

                            <FieldGroup>
                                <ReadOnlyField>
                                    <ReadOnlyLabel>{t.checkin.verification.model}</ReadOnlyLabel>
                                    <ReadOnlyValue>{formData.vehicleData.model}</ReadOnlyValue>
                                </ReadOnlyField>
                            </FieldGroup>

                            <FieldGroup>
                                <ReadOnlyField>
                                    <ReadOnlyLabel>Rok produkcji</ReadOnlyLabel>
                                    <ReadOnlyValue>{formData.vehicleData.yearOfProduction || '-'}</ReadOnlyValue>
                                </ReadOnlyField>
                            </FieldGroup>

                            <FieldGroup>
                                <ReadOnlyField>
                                    <ReadOnlyLabel>{t.checkin.verification.licensePlate}</ReadOnlyLabel>
                                    <ReadOnlyValue>{formData.vehicleData.licensePlate || '-'}</ReadOnlyValue>
                                </ReadOnlyField>
                            </FieldGroup>

                            <FieldGroup>
                                <ReadOnlyField>
                                    <ReadOnlyLabel>Kolor</ReadOnlyLabel>
                                    <ReadOnlyValue>{formData.vehicleData.color || '-'}</ReadOnlyValue>
                                </ReadOnlyField>
                            </FieldGroup>

                            <FieldGroup>
                                <ReadOnlyField>
                                    <ReadOnlyLabel>Typ lakieru</ReadOnlyLabel>
                                    <ReadOnlyValue>{formData.vehicleData.paintType || '-'}</ReadOnlyValue>
                                </ReadOnlyField>
                            </FieldGroup>
                        </FormGrid>
                    </>
                ) : (
                    <>
                        <SectionTitle>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                            {t.checkin.verification.vehicleSection}
                        </SectionTitle>
                        <CustomerSelectButton
                            $variant="primary"
                            onClick={() => setIsVehicleModalOpen(true)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px', height: '20px', marginRight: '8px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                            Dodaj lub wyszukaj pojazd
                        </CustomerSelectButton>
                    </>
                )}

                <Divider />

                {/* Sekcja: Stan techniczny (jeden wiersz: przebieg + depozyty) */}
                <SectionTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m8-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t.checkin.technical.title}
                </SectionTitle>

                <FormGrid $columns={2}>
                    <FieldGroup>
                        <Label>{t.checkin.technical.mileage}</Label>
                        <Input
                            type="number"
                            value={formData.technicalState.mileage || ''}
                            onChange={(e) => onChange({
                                technicalState: {
                                    ...formData.technicalState,
                                    mileage: parseInt(e.target.value) || 0,
                                },
                            })}
                            placeholder={t.checkin.technical.mileagePlaceholder}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.technical.deposit}</Label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Toggle
                                    checked={formData.technicalState.deposit.keys}
                                    onChange={(checked) => onChange({
                                        technicalState: {
                                            ...formData.technicalState,
                                            deposit: { ...formData.technicalState.deposit, keys: checked },
                                        },
                                    })}
                                    label={t.checkin.technical.depositItems.keys}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Toggle
                                    checked={formData.technicalState.deposit.registrationDocument}
                                    onChange={(checked) => onChange({
                                        technicalState: {
                                            ...formData.technicalState,
                                            deposit: { ...formData.technicalState.deposit, registrationDocument: checked },
                                        },
                                    })}
                                    label={t.checkin.technical.depositItems.registrationDocument}
                                />
                            </div>
                        </div>
                    </FieldGroup>
                </FormGrid>

                {errors.mileage && (
                    <ErrorMessage>{errors.mileage}</ErrorMessage>
                )}

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

                <Divider />

                {/* Sekcja: Notatki z oględzin */}
                <SectionTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    {t.checkin.technical.inspectionNotes}
                </SectionTitle>
                <FormGrid $columns={1}>
                    <FieldGroup>
                        <Label>{t.checkin.technical.inspectionNotes}</Label>
                        <TextArea
                            value={formData.technicalState.inspectionNotes}
                            onChange={(e) => onChange({
                                technicalState: {
                                    ...formData.technicalState,
                                    inspectionNotes: e.target.value,
                                },
                            })}
                            placeholder={t.checkin.technical.inspectionNotesPlaceholder}
                        />
                    </FieldGroup>
                </FormGrid>

            </Card>

            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSelect={handleCustomerSelect}
            />

            <CustomerDetailsModal
                isOpen={isCustomerDetailsModalOpen}
                onClose={() => setIsCustomerDetailsModalOpen(false)}
                customerId={formData.customerData.id || null}
                fallbackData={{
                    firstName: formData.customerData.firstName,
                    lastName: formData.customerData.lastName,
                    email: formData.customerData.email,
                    phone: formData.customerData.phone,
                    homeAddress: formData.homeAddress,
                    company: formData.company,
                }}
                onSave={handleCustomerDetailsSave}
            />

            <VehicleSearchModal
                isOpen={isVehicleModalOpen}
                onClose={() => setIsVehicleModalOpen(false)}
                onSelect={handleVehicleSelect}
                customerId={formData.customerData.id}
            />

            <VehicleDetailsModal
                isOpen={isVehicleDetailsModalOpen}
                onClose={() => setIsVehicleDetailsModalOpen(false)}
                vehicleId={formData.vehicleData?.id || null}
                fallbackData={{
                    brand: formData.vehicleData?.brand || '',
                    model: formData.vehicleData?.model || '',
                    yearOfProduction: formData.vehicleData?.yearOfProduction,
                    licensePlate: formData.vehicleData?.licensePlate || '',
                    color: formData.vehicleData?.color,
                    paintType: formData.vehicleData?.paintType,
                }}
                onSave={handleVehicleDetailsSave}
            />
        </StepContainer>
    );
};
