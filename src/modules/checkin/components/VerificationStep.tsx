import { useState, useEffect, useRef } from 'react';
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
import { fromDateToLocalInput } from '@/common/dateTime';
import type { CheckInFormData, ServiceLineItem } from '../types';
import { Modal } from '@/common/components/Modal';

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

const Badge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
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

    &:disabled {
        color: ${props => props.theme.colors.textMuted};
        background: ${props => props.theme.colors.surfaceAlt};
        border-color: ${props => props.theme.colors.border};
        cursor: not-allowed;
        opacity: 0.7;
        pointer-events: none;
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


// New Google Calendar-like dropdown for appointment color
const ColorDropdownContainer = styled.div`
    position: relative;
`;

const ColorTrigger = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.theme.colors.surface};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    font-weight: ${props => props.theme.fontWeights.medium};

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
    }

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const ColorSwatch = styled.span<{ $color: string }>`
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background-color: ${props => props.$color};
    border: 1px solid rgba(0,0,0,0.1);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);
`;

const Caret = styled.span`
    margin-left: auto;
    border: solid ${props => props.theme.colors.textMuted};
    border-width: 0 2px 2px 0;
    display: inline-block;
    padding: 3px;
    transform: rotate(45deg);
`;

const ColorMenu = styled.div`
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.lg};
    padding: ${props => props.theme.spacing.xs} 0;
    z-index: 20;
    max-height: 320px;
    overflow: auto;
`;

const ColorMenuItem = styled.button<{ $selected?: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: 10px 14px;
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: ${props => props.theme.fontSizes.md};

    ${props => props.$selected ? `
        background: ${props.theme.colors.surfaceAlt};
        font-weight: ${props.theme.fontWeights.semibold};
    ` : ''}

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
    }
`;

interface ColorDropdownProps {
    colors: AppointmentColor[];
    value: string;
    onChange: (value: string) => void;
}

const ColorDropdown = ({ colors, value, onChange }: ColorDropdownProps) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc);
        };
    }, []);

    const selected = colors.find(c => c.id === value);

    return (
        <ColorDropdownContainer ref={ref}>
            <ColorTrigger type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
                <ColorSwatch $color={selected?.hexColor || '#cccccc'} />
                <span>{selected?.name || 'Wybierz kolor'}</span>
                <Caret />
            </ColorTrigger>
            {open && (
                <ColorMenu role="listbox">
                    {colors.map(c => (
                        <ColorMenuItem
                            key={c.id}
                            role="option"
                            aria-selected={c.id === value}
                            $selected={c.id === value}
                            onClick={() => { onChange(c.id); setOpen(false); }}
                        >
                            <ColorSwatch $color={c.hexColor} />
                            <span>{c.name}</span>
                        </ColorMenuItem>
                    ))}
                </ColorMenu>
            )}
        </ColorDropdownContainer>
    );
};

interface VerificationStepProps {
    formData: CheckInFormData;
    errors: Record<string, string>;
    onChange: (updates: Partial<CheckInFormData>) => void;
    onServicesChange: (services: ServiceLineItem[]) => void;
    colors: AppointmentColor[];
    showTechnicalSection?: boolean;
    hideVehicleColorAndPaint?: boolean;
    hideLicensePlate?: boolean;
    // Initial snapshots for Reset functionality
    initialCustomerData?: CheckInFormData['customerData'];
    initialHasFullCustomerData?: boolean;
    initialIsNewCustomer?: boolean;
    initialVehicleData?: CheckInFormData['vehicleData'];
    initialIsNewVehicle?: boolean;
}

export const VerificationStep    = ({ formData, errors, onChange, onServicesChange, colors, showTechnicalSection = true, hideVehicleColorAndPaint = false, hideLicensePlate = false, initialCustomerData, initialHasFullCustomerData, initialIsNewCustomer, initialVehicleData, initialIsNewVehicle }: VerificationStepProps) => {
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isCustomerDetailsModalOpen, setIsCustomerDetailsModalOpen] = useState(false);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [isVehicleDetailsModalOpen, setIsVehicleDetailsModalOpen] = useState(false);

    // New inline choice modals state
    const [showCustomerChoice, setShowCustomerChoice] = useState(false);
    const [customerChoiceMade, setCustomerChoiceMade] = useState(false);
    const [pendingCustomerUpdates, setPendingCustomerUpdates] = useState<Partial<CheckInFormData['customerData']> | null>(null);
    const [customerPromptScheduled, setCustomerPromptScheduled] = useState(false);

    const [showVehicleChoice, setShowVehicleChoice] = useState(false);
    const [vehicleChoiceMade, setVehicleChoiceMade] = useState(false);
    const [pendingVehicleUpdates, setPendingVehicleUpdates] = useState<Partial<NonNullable<CheckInFormData['vehicleData']>> | null>(null);
    const [vehiclePromptScheduled, setVehiclePromptScheduled] = useState(false);

    // Derived badges labels
    const customerBadge = formData.isNewCustomer
        ? 'Dodasz nowego klienta'
        : (formData.customerData.id ? 'Aktualizujesz dane istniejącego klienta' : undefined);

    const vehicleBadge = (formData.vehicleData === null)
        ? undefined
        : ((formData.isNewVehicle || !formData.vehicleData?.id) ? 'Dodasz nowy pojazd' : 'Aktualizujesz dane istniejącego pojazdu');

    // Compute whether there are changes to enable/disable Reset buttons
    const canResetCustomer = !(initialCustomerData === undefined && initialHasFullCustomerData === undefined && initialIsNewCustomer === undefined);
    const customerDataEqual = initialCustomerData === undefined ? true : (
        initialCustomerData.id === formData.customerData.id &&
        initialCustomerData.firstName === formData.customerData.firstName &&
        initialCustomerData.lastName === formData.customerData.lastName &&
        initialCustomerData.phone === formData.customerData.phone &&
        initialCustomerData.email === formData.customerData.email
    );
    const customerHasFullEqual = initialHasFullCustomerData === undefined ? true : (initialHasFullCustomerData === formData.hasFullCustomerData);
    const customerIsNewEqual = initialIsNewCustomer === undefined ? true : (initialIsNewCustomer === formData.isNewCustomer);
    const hasCustomerChanges = canResetCustomer && !(customerDataEqual && customerHasFullEqual && customerIsNewEqual);

    const canResetVehicle = !(initialVehicleData === undefined && initialIsNewVehicle === undefined);
    const vehicleDataEqual = initialVehicleData === undefined ? true : (
        (initialVehicleData === null && formData.vehicleData === null) ||
        (initialVehicleData !== null && formData.vehicleData !== null &&
            initialVehicleData.id === formData.vehicleData.id &&
            initialVehicleData.brand === formData.vehicleData.brand &&
            initialVehicleData.model === formData.vehicleData.model &&
            initialVehicleData.yearOfProduction === formData.vehicleData.yearOfProduction &&
            (initialVehicleData.licensePlate || '') === (formData.vehicleData.licensePlate || '') &&
            (initialVehicleData.color || '') === (formData.vehicleData.color || '') &&
            (initialVehicleData.paintType || '') === (formData.vehicleData.paintType || '')
        )
    );
    const vehicleIsNewEqual = initialIsNewVehicle === undefined ? true : (initialIsNewVehicle === formData.isNewVehicle);
    const hasVehicleChanges = canResetVehicle && !(vehicleDataEqual && vehicleIsNewEqual);

    // Reset handlers
    const handleResetCustomer = () => {
        if (!initialCustomerData && initialCustomerData !== null && initialHasFullCustomerData === undefined && initialIsNewCustomer === undefined) return;
        onChange({
            customerData: initialCustomerData ? { ...initialCustomerData } : { id: '', firstName: '', lastName: '', phone: '', email: '' },
            hasFullCustomerData: initialHasFullCustomerData ?? false,
            isNewCustomer: initialIsNewCustomer ?? false,
        });
        setCustomerChoiceMade(false);
        setPendingCustomerUpdates(null);
        setShowCustomerChoice(false);
        setCustomerPromptScheduled(false);
    };

    const handleResetVehicle = () => {
        onChange({
            vehicleData: (initialVehicleData === undefined) ? formData.vehicleData : (initialVehicleData ?? null),
            isNewVehicle: initialIsNewVehicle ?? false,
        });
        setVehicleChoiceMade(false);
        setPendingVehicleUpdates(null);
        setShowVehicleChoice(false);
        setVehiclePromptScheduled(false);
    };

    const applyCustomerUpdates = (updates: Partial<CheckInFormData['customerData']>) => {
        onChange({
            customerData: {
                ...formData.customerData,
                ...updates,
            },
        });
        setCustomerChoiceMade(true);
    };

    const handleCustomerFieldBlur = () => {
        // Show modal only when leaving the field, not on first input
        if (!customerChoiceMade && formData.customerData.id && customerPromptScheduled && pendingCustomerUpdates) {
            setShowCustomerChoice(true);
            setCustomerPromptScheduled(false);
            return;
        }
        // If no existing id (new customer) or choice already made, just apply queued updates
        if (pendingCustomerUpdates) {
            applyCustomerUpdates(pendingCustomerUpdates);
            setPendingCustomerUpdates(null);
            setCustomerPromptScheduled(false);
        }
    };

    const handleCustomerFieldChange = (updates: Partial<CheckInFormData['customerData']>) => {
        // If user edits while an existing customer is selected, schedule the prompt for blur instead of opening immediately
        if (!customerChoiceMade && formData.customerData.id) {
            setPendingCustomerUpdates(prev => ({ ...(prev || {}), ...updates }));
            setCustomerPromptScheduled(true);
            return;
        }
        // Otherwise, apply immediately (new customer or decision already made)
        applyCustomerUpdates(updates);
    };

    const confirmCustomerEditExisting = () => {
        // Keep existing id, mark as not new and ensure full data mode for inline editing
        onChange({ isNewCustomer: false, hasFullCustomerData: true });
        setCustomerChoiceMade(true);
        setShowCustomerChoice(false);
        setCustomerPromptScheduled(false);
        if (pendingCustomerUpdates) {
            applyCustomerUpdates(pendingCustomerUpdates);
            setPendingCustomerUpdates(null);
        }
    };

    const confirmCustomerAddNew = () => {
        // Clear id and mark as new; switch to full data mode so validation expects inline fields, not selected id
        onChange({
            isNewCustomer: true,
            hasFullCustomerData: true,
            customerData: { ...formData.customerData, id: '' },
        });
        setCustomerChoiceMade(true);
        setShowCustomerChoice(false);
        if (pendingCustomerUpdates) {
            applyCustomerUpdates(pendingCustomerUpdates);
            setPendingCustomerUpdates(null);
        }
    };

    const applyVehicleUpdates = (updates: Partial<NonNullable<CheckInFormData['vehicleData']>>) => {
        const base = formData.vehicleData || {
            id: '',
            brand: '',
            model: '',
            yearOfProduction: new Date().getFullYear(),
            licensePlate: '',
            color: '',
            paintType: '',
        };
        onChange({
            vehicleData: {
                ...base,
                ...updates,
            },
        });
    };

    const handleVehicleFieldChange = (updates: Partial<NonNullable<CheckInFormData['vehicleData']>>) => {
        if (!vehicleChoiceMade && formData.vehicleData?.id) {
            setPendingVehicleUpdates(prev => ({ ...(prev || {}), ...updates }));
            setVehiclePromptScheduled(true);
            return;
        }
        applyVehicleUpdates(updates);
    };

    const handleVehicleFieldBlur = () => {
        if (!vehicleChoiceMade && formData.vehicleData?.id && vehiclePromptScheduled && pendingVehicleUpdates) {
            setShowVehicleChoice(true);
            setVehiclePromptScheduled(false);
            return;
        }
        if (pendingVehicleUpdates) {
            applyVehicleUpdates(pendingVehicleUpdates);
            setPendingVehicleUpdates(null);
            setVehiclePromptScheduled(false);
        }
    };

    const confirmVehicleEditExisting = () => {
        onChange({ isNewVehicle: false });
        setVehicleChoiceMade(true);
        setShowVehicleChoice(false);
        if (pendingVehicleUpdates) {
            applyVehicleUpdates(pendingVehicleUpdates);
            setPendingVehicleUpdates(null);
        }
    };

    const confirmVehicleAddNew = () => {
        const current = formData.vehicleData || {
            id: '', brand: '', model: '', yearOfProduction: new Date().getFullYear(), licensePlate: '', color: '', paintType: ''
        };
        onChange({
            isNewVehicle: true,
            vehicleData: { ...current, id: '' },
        });
        setVehicleChoiceMade(true);
        setShowVehicleChoice(false);
        if (pendingVehicleUpdates) {
            applyVehicleUpdates(pendingVehicleUpdates);
            setPendingVehicleUpdates(null);
        }
    };

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
        setCustomerChoiceMade(true);
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
        setCustomerChoiceMade(true);
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
                color: vehicle.color,
                paintType: vehicle.paintType,
            },
            isNewVehicle: vehicle.isNew || false,
        });
        setVehicleChoiceMade(true);
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
        setVehicleChoiceMade(true);
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
                            onChange={(e) => {
                                const start = e.target.value;
                                let updates: Partial<CheckInFormData> = { visitStartAt: start };
                                if (!formData.visitEndAt) {
                                    const d = new Date(start);
                                    if (!isNaN(d.getTime())) {
                                        d.setHours(d.getHours() + 1);
                                        updates.visitEndAt = fromDateToLocalInput(d);
                                    }
                                } else {
                                    const s = new Date(start);
                                    const eDate = new Date(formData.visitEndAt);
                                    if (!isNaN(s.getTime()) && !isNaN(eDate.getTime()) && eDate < s) {
                                        const d2 = new Date(s.getTime());
                                        d2.setHours(d2.getHours() + 1);
                                        updates.visitEndAt = fromDateToLocalInput(d2);
                                    }
                                }
                                onChange(updates);
                            }}
                        />
                    </FieldGroup>
                    <FieldGroup>
                        <Label>Data zakończenia</Label>
                        <Input
                            type="datetime-local"
                            value={formData.visitEndAt ? formData.visitEndAt : ''}
                            onChange={(e) => {
                                const newEnd = e.target.value;
                                let nextEnd = newEnd;
                                if (formData.visitStartAt) {
                                    const s = new Date(formData.visitStartAt);
                                    const eDate = new Date(newEnd);
                                    if (!isNaN(s.getTime()) && !isNaN(eDate.getTime()) && eDate < s) {
                                        const d = new Date(s.getTime());
                                        d.setHours(d.getHours() + 1);
                                        nextEnd = fromDateToLocalInput(d);
                                    }
                                }
                                onChange({ visitEndAt: nextEnd });
                            }}
                        />
                    </FieldGroup>
                    <FieldGroup>
                        <Label>Kolor w kalendarzu</Label>
                        <ColorDropdown
                            colors={colors}
                            value={formData.appointmentColorId}
                            onChange={(val) => onChange({ appointmentColorId: val })}
                        />
                    </FieldGroup>
                </FormGrid>

                <Divider />

                <SectionHeader>
                    <SectionTitleWithActions>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {t.checkin.verification.customerSection}
                        {customerChoiceMade && customerBadge && <Badge>{customerBadge}</Badge>}
                    </SectionTitleWithActions>
                    <SubtleButtonGroup>
                        <SubtleButton onClick={handleResetCustomer} disabled={!hasCustomerChanges}>
                            Wycofaj zmiany
                        </SubtleButton>
                        <SubtleButton onClick={() => setIsCustomerModalOpen(true)}>
                            Wyszukaj / zmień klienta
                        </SubtleButton>
                    </SubtleButtonGroup>
                </SectionHeader>

                <FormGrid>
                    <FieldGroup>
                        <Label>{t.checkin.verification.firstName}</Label>
                        <Input
                            value={(pendingCustomerUpdates?.firstName ?? formData.customerData.firstName) || ''}
                            onChange={(e) => handleCustomerFieldChange({ firstName: e.target.value })}
                            onBlur={handleCustomerFieldBlur}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.verification.lastName}</Label>
                        <Input
                            value={(pendingCustomerUpdates?.lastName ?? formData.customerData.lastName) || ''}
                            onChange={(e) => handleCustomerFieldChange({ lastName: e.target.value })}
                            onBlur={handleCustomerFieldBlur}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.verification.phone}</Label>
                        <Input
                            value={(pendingCustomerUpdates?.phone ?? formData.customerData.phone) || ''}
                            onChange={(e) => handleCustomerFieldChange({ phone: e.target.value })}
                            onBlur={handleCustomerFieldBlur}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.verification.email}</Label>
                        <Input
                            type="email"
                            value={(pendingCustomerUpdates?.email ?? formData.customerData.email) || ''}
                            onChange={(e) => handleCustomerFieldChange({ email: e.target.value })}
                            onBlur={handleCustomerFieldBlur}
                        />
                    </FieldGroup>
                </FormGrid>

                <Divider />

                <SectionHeader>
                    <SectionTitleWithActions>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        {t.checkin.verification.vehicleSection}
                        {vehicleChoiceMade && vehicleBadge && <Badge>{vehicleBadge}</Badge>}
                    </SectionTitleWithActions>
                    <SubtleButtonGroup>
                        <SubtleButton onClick={handleResetVehicle} disabled={!hasVehicleChanges}>
                            Wycofaj zmiany
                        </SubtleButton>
                        <SubtleButton onClick={() => setIsVehicleModalOpen(true)}>
                            Wyszukaj / zmień pojazd
                        </SubtleButton>
                    </SubtleButtonGroup>
                </SectionHeader>

                <FormGrid $columns={3}>
                    <FieldGroup>
                        <Label>{t.checkin.verification.brand}</Label>
                        <Input
                            value={(pendingVehicleUpdates?.brand ?? formData.vehicleData?.brand) || ''}
                            onChange={(e) => handleVehicleFieldChange({ brand: e.target.value })}
                            onBlur={handleVehicleFieldBlur}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.verification.model}</Label>
                        <Input
                            value={(pendingVehicleUpdates?.model ?? formData.vehicleData?.model) || ''}
                            onChange={(e) => handleVehicleFieldChange({ model: e.target.value })}
                            onBlur={handleVehicleFieldBlur}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>Rok produkcji</Label>
                        <Input
                            type="number"
                            value={(pendingVehicleUpdates?.yearOfProduction ?? formData.vehicleData?.yearOfProduction) ?? ''}
                            onChange={(e) => handleVehicleFieldChange({ yearOfProduction: parseInt(e.target.value) || new Date().getFullYear() })}
                            onBlur={handleVehicleFieldBlur}
                        />
                    </FieldGroup>

                    {!hideLicensePlate && (
                        <FieldGroup>
                            <Label>{t.checkin.verification.licensePlate}</Label>
                            <Input
                                value={(pendingVehicleUpdates?.licensePlate ?? formData.vehicleData?.licensePlate) || ''}
                                onChange={(e) => handleVehicleFieldChange({ licensePlate: e.target.value })}
                                onBlur={handleVehicleFieldBlur}
                            />
                        </FieldGroup>
                    )}

                    {!hideVehicleColorAndPaint && (
                        <>
                            <FieldGroup>
                                <Label>Kolor</Label>
                                <Input
                                    value={(pendingVehicleUpdates?.color ?? formData.vehicleData?.color) || ''}
                                    onChange={(e) => handleVehicleFieldChange({ color: e.target.value })}
                                    onBlur={handleVehicleFieldBlur}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>Typ lakieru</Label>
                                <Input
                                    value={formData.vehicleData?.paintType || ''}
                                    onChange={(e) => handleVehicleFieldChange({ paintType: e.target.value })}
                                    onBlur={handleVehicleFieldBlur}
                                />
                            </FieldGroup>
                        </>
                    )}
                </FormGrid>

                {showTechnicalSection && (
                    <>
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
                    </>
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

            {/* Choice modal for customer changes */}
            <Modal
                isOpen={showCustomerChoice}
                onClose={() => setShowCustomerChoice(false)}
                title="Aktualizacja danych klienta"
            >
                <p>Czy chcesz edytować dane istniejącego klienta czy dodać nowego?</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
                    <Button $variant="secondary" onClick={confirmCustomerEditExisting}>Edytuj istniejącego</Button>
                    <Button $variant="primary" onClick={confirmCustomerAddNew}>Dodaj jako nowego</Button>
                </div>
            </Modal>

            {/* Choice modal for vehicle changes */}
            <Modal
                isOpen={showVehicleChoice}
                onClose={() => setShowVehicleChoice(false)}
                title="Aktualizacja pojazdu"
            >
                <p>Czy chcesz edytować dane istniejącego pojazdu czy dodać nowy?</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
                    <Button $variant="secondary" onClick={confirmVehicleEditExisting}>Edytuj istniejący</Button>
                    <Button $variant="primary" onClick={confirmVehicleAddNew}>Dodaj jako nowy</Button>
                </div>
            </Modal>

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
