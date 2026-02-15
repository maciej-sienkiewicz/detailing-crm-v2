// src/modules/checkin/components/EditableServicesTable.tsx

import { useState } from 'react';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/common/utils';
import { Select, Input } from '@/common/components/Form';
import { ServiceAutocomplete } from './ServiceAutocomplete';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import type { ServiceLineItem, AdjustmentType } from '../types';
import type { Service } from '@/modules/services/types';

const TableContainer = styled.div`
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
    border: 1px solid ${props => props.theme.colors.border};
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

const Thead = styled.thead`
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
`;

const Th = styled.th`
    padding: ${props => props.theme.spacing.md};
    text-align: left;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.5px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.lg};
        font-size: ${props => props.theme.fontSizes.xs};
    }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
    border-bottom: 1px solid ${props => props.theme.colors.border};
    transition: background-color ${props => props.theme.transitions.fast};

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
    }

    &:last-child {
        border-bottom: none;
    }
`;

const Td = styled.td`
    padding: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.lg};
    }
`;

const ServiceName = styled.div`
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const PriceCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const PriceLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.3px;
`;

const PriceValue = styled.div<{ $highlight?: boolean }>`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.$highlight ? props.theme.colors.primary : props.theme.colors.text};
    font-feature-settings: 'tnum';
`;

const PriceInput = styled(Input)`
    width: 100%;
    max-width: 150px;
    text-align: right;
    font-feature-settings: 'tnum';
    font-weight: ${props => props.theme.fontWeights.semibold};
`;

const DiscountSelect = styled(Select)`
    width: 100%;
    max-width: 180px;
    font-size: ${props => props.theme.fontSizes.sm};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: white;
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        border-color: ${props => props.theme.colors.primary};
    }

    &:focus {
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
        outline: none;
    }
`;

const DiscountInputWrapper = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    background: white;
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    transition: all ${props => props.theme.transitions.fast};
    max-width: 150px;

    &:focus-within {
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const DiscountInput = styled.input`
    width: 100%;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: transparent;
    color: ${props => props.theme.colors.text};
    text-align: right;
    font-feature-settings: 'tnum';

    &:focus {
        outline: none;
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const DiscountSuffix = styled.span`
    padding-right: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const DiscountCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const DiscountAmount = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.success};
    font-weight: ${props => props.theme.fontWeights.medium};
    padding: ${props => props.theme.spacing.xs};
    background-color: ${props => props.theme.colors.successLight || '#f0fdf4'};
    border-radius: ${props => props.theme.radii.sm};
    text-align: center;
    font-feature-settings: 'tnum';
`;

const ActionButton = styled.button`
    padding: ${props => props.theme.spacing.sm};
    background-color: transparent;
    border: none;
    cursor: pointer;
    color: ${props => props.theme.colors.textSecondary};
    transition: all ${props => props.theme.transitions.fast};
    border-radius: ${props => props.theme.radii.sm};
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background-color: ${props => props.theme.colors.errorLight};
        color: ${props => props.theme.colors.error};
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

const TotalRow = styled.tr`
    background: linear-gradient(to right, 
        ${props => props.theme.colors.surfaceAlt} 0%, 
        ${props => props.theme.colors.surface} 100%);
    border-top: 3px solid ${props => props.theme.colors.primary};
    font-weight: ${props => props.theme.fontWeights.bold};
`;

const TotalLabel = styled(Td)`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.text};
    text-transform: uppercase;
    letter-spacing: 0.5px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.lg};
    }
`;

const TotalValue = styled(Td)`
    font-size: ${props => props.theme.fontSizes.lg};
    color: ${props => props.theme.colors.primary};
    font-feature-settings: 'tnum';

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xl};
    }
`;

const NoteInput = styled(Input)`
    margin-top: ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const NoteDisplay = styled.div`
    margin-top: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.sm};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    cursor: pointer;
    transition: background-color ${props => props.theme.transitions.fast};

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
    }

    &:empty::before {
        content: 'Kliknij aby dodać notatkę...';
        color: ${props => props.theme.colors.textMuted};
        font-style: italic;
    }
`;

const CustomPriceLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.warning || '#f59e0b'};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    background-color: ${props => props.theme.colors.warningLight || '#fef3c7'};
    border-radius: ${props => props.theme.radii.sm};
    text-align: center;
`;

const DiscountButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: #f59e0b;
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};

    &:hover:not(:disabled) {
        background: #d97706;
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const ModalCard = styled.div`
    width: 100%;
    max-width: 440px;
    background: #fff;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: 0 20px 50px rgba(2,6,23,0.15);
    overflow: hidden;
`;

const ModalHeader = styled.div`
    padding: ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ModalTitle = styled.h4`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
`;

const ModalBody = styled.div`
    padding: ${props => props.theme.spacing.lg};
    color: ${props => props.theme.colors.textSecondary};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const ModalFooter = styled.div`
    padding: ${props => props.theme.spacing.md};
    display: flex;
    justify-content: flex-end;
    gap: ${props => props.theme.spacing.sm};
    background: ${props => props.theme.colors.surfaceAlt};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const SecondaryBtn = styled.button`
    padding: 6px 10px;
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
    background: transparent;
    color: ${props => props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.xs};
    cursor: pointer;

    &:hover { background: ${props => props.theme.colors.surfaceAlt}; }
`;

const PrimaryBtn = styled.button`
    padding: 6px 10px;
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
    background: ${props => props.theme.colors.surfaceAlt};
    color: var(--brand-primary);
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    cursor: pointer;

    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const RadioGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.md};
`;

const RadioLabel = styled.label`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    cursor: pointer;

    input[type="radio"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
    }
`;

const ModalInput = styled(Input)`
    width: 100%;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

interface EditableServicesTableProps {
    services: ServiceLineItem[];
    onChange: (services: ServiceLineItem[]) => void;
}

export const EditableServicesTable = ({ services, onChange }: EditableServicesTableProps) => {
    const [editingPrices, setEditingPrices] = useState<Record<string, boolean>>({});
    const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});
    const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
    const [quickServiceInitialName, setQuickServiceInitialName] = useState('');
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [discountPriceType, setDiscountPriceType] = useState<'net' | 'gross'>('gross');
    const [targetPrice, setTargetPrice] = useState('');
    const [discountInputValues, setDiscountInputValues] = useState<Record<string, string>>({});
    const [focusedDiscountFields, setFocusedDiscountFields] = useState<Record<string, boolean>>({});
    const queryClient = useQueryClient();

    const calculateServicePrice = (service: ServiceLineItem) => {
        const { basePriceNet, vatRate, adjustment } = service;
        let finalPriceNet = basePriceNet;

        switch (adjustment.type) {
            case 'PERCENT': {
                const percentageAmount = Math.round((basePriceNet * Math.abs(adjustment.value)) / 100);
                finalPriceNet = adjustment.value > 0
                    ? basePriceNet + percentageAmount
                    : basePriceNet - percentageAmount;
                break;
            }
            case 'FIXED_NET': {
                finalPriceNet = basePriceNet - Math.abs(adjustment.value);
                break;
            }
            case 'FIXED_GROSS': {
                const targetGross = (basePriceNet * (100 + vatRate)) / 100 - Math.abs(adjustment.value);
                finalPriceNet = Math.round((targetGross * 100) / (100 + vatRate));
                break;
            }
            case 'SET_NET': {
                finalPriceNet = adjustment.value;
                break;
            }
            case 'SET_GROSS': {
                finalPriceNet = Math.round((adjustment.value * 100) / (100 + vatRate));
                break;
            }
        }

        if (finalPriceNet < 0) finalPriceNet = 0;

        let vatAmount;
        let finalPriceGross;

        if (adjustment.type === 'SET_GROSS') {
            // For SET_GROSS, ensure exact gross value
            finalPriceGross = adjustment.value;
            vatAmount = finalPriceGross - finalPriceNet;
        } else {
            vatAmount = Math.round((finalPriceNet * vatRate) / 100);
            finalPriceGross = finalPriceNet + vatAmount;
        }

        // Oblicz kwotę rabatu
        const basePriceGross = basePriceNet + Math.round((basePriceNet * vatRate) / 100);
        const discountAmountNet = basePriceNet - finalPriceNet;
        const discountAmountGross = basePriceGross - finalPriceGross;

        return {
            finalPriceNet,
            finalPriceGross,
            vatAmount,
            discountAmountNet,
            discountAmountGross,
            hasDiscount: discountAmountNet !== 0,
        };
    };

    const calculateTotals = () => {
        let totalNet = 0;
        let totalGross = 0;
        let totalVat = 0;

        services.forEach(service => {
            const pricing = calculateServicePrice(service);
            totalNet += pricing.finalPriceNet;
            totalGross += pricing.finalPriceGross;
            totalVat += pricing.vatAmount;
        });

        return { totalNet, totalGross, totalVat };
    };

    const openDiscountModal = () => {
        setIsDiscountModalOpen(true);
        setTargetPrice('');
        setDiscountPriceType('gross');
    };

    const closeDiscountModal = () => {
        setIsDiscountModalOpen(false);
        setTargetPrice('');
    };

    const handleApplyDiscount = () => {
        if (!targetPrice || services.length === 0) return;

        const targetAmount = parseFloat(targetPrice) * 100; // Convert to cents
        if (isNaN(targetAmount) || targetAmount <= 0) return;

        const totals = calculateTotals();
        // Calculate current total based on price type
        const currentTotal = discountPriceType === 'gross'
            ? totals.totalGross
            : totals.totalNet;

        // Calculate discount percentage needed
        const discountPercentage = ((currentTotal - targetAmount) / currentTotal) * 100;

        if (discountPercentage < 0 || discountPercentage > 100) {
            alert('Podana kwota jest nieprawidłowa. Musi być niższa niż obecna suma.');
            return;
        }

        // Round discount percentage to 2 decimal places
        const roundedDiscountPercentage = Math.round(discountPercentage * 100) / 100;

        // Apply discount to all services using PERCENT adjustment (negative value = discount)
        const updatedServices = services.map((service) => {
            return {
                ...service,
                adjustment: {
                    type: 'PERCENT' as const,
                    value: -roundedDiscountPercentage,
                },
            };
        });

        // Calculate actual total after applying discounts
        let actualTotal = 0;
        updatedServices.forEach(service => {
            const pricing = calculateServicePrice(service);
            actualTotal += discountPriceType === 'gross' ? pricing.finalPriceGross : pricing.finalPriceNet;
        });

        // If there's a rounding error, adjust the last service's discount
        const difference = actualTotal - targetAmount;
        if (difference !== 0 && updatedServices.length > 0) {
            const lastIndex = updatedServices.length - 1;
            const lastService = updatedServices[lastIndex];

            // Calculate how much we need to adjust the last service
            const lastServicePricing = calculateServicePrice(lastService);
            const lastServiceTotal = discountPriceType === 'gross'
                ? lastServicePricing.finalPriceGross
                : lastServicePricing.finalPriceNet;

            const adjustedLastServiceTotal = lastServiceTotal - difference;

            // Set the last service to have exact price using SET_NET or SET_GROSS
            if (discountPriceType === 'gross') {
                updatedServices[lastIndex] = {
                    ...lastService,
                    adjustment: {
                        type: 'SET_GROSS' as const,
                        value: adjustedLastServiceTotal,
                    },
                };
            } else {
                updatedServices[lastIndex] = {
                    ...lastService,
                    adjustment: {
                        type: 'SET_NET' as const,
                        value: adjustedLastServiceTotal,
                    },
                };
            }
        }

        onChange(updatedServices);
        closeDiscountModal();
    };

    const handlePriceEdit = (serviceId: string, field: 'net' | 'gross', value: string) => {
        const numValue = Math.round(parseFloat(value) * 100) || 0;
        const updatedServices = services.map(s => {
            if (s.id === serviceId) {
                return {
                    ...s,
                    adjustment: {
                        type: field === 'net' ? 'SET_NET' : 'SET_GROSS',
                        value: numValue,
                    } as typeof s.adjustment,
                };
            }
            return s;
        });
        onChange(updatedServices);
    };

    const handleDiscountTypeChange = (serviceId: string, type: AdjustmentType) => {
        const updatedServices = services.map(s => {
            if (s.id === serviceId) {
                return {
                    ...s,
                    adjustment: {
                        type,
                        value: 0,
                    },
                };
            }
            return s;
        });
        onChange(updatedServices);

        // Clear local input state when type changes
        setDiscountInputValues(prev => {
            const newState = { ...prev };
            delete newState[serviceId];
            return newState;
        });
    };

    const handleDiscountValueChange = (serviceId: string, value: string) => {
        // Just update the local input state while user is typing
        setDiscountInputValues(prev => ({
            ...prev,
            [serviceId]: value,
        }));
    };

    const handleDiscountFocus = (serviceId: string) => {
        setFocusedDiscountFields(prev => ({
            ...prev,
            [serviceId]: true,
        }));

        // Initialize input value from current service value if not already set
        const service = services.find(s => s.id === serviceId);
        if (service && discountInputValues[serviceId] === undefined) {
            const isMoneyType = ['FIXED_NET', 'FIXED_GROSS', 'SET_NET', 'SET_GROSS'].includes(service.adjustment.type);
            const currentValue = service.adjustment.value === 0
                ? ''
                : (isMoneyType
                    ? formatMoneyInput(Math.abs(service.adjustment.value))
                    : String(service.adjustment.value));

            setDiscountInputValues(prev => ({
                ...prev,
                [serviceId]: currentValue,
            }));
        }
    };

    const handleDiscountBlur = (serviceId: string) => {
        setFocusedDiscountFields(prev => ({
            ...prev,
            [serviceId]: false,
        }));

        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        const inputValue = discountInputValues[serviceId] || '';

        // Handle empty string (when user clears the input)
        if (inputValue === '' || inputValue === '-') {
            const updatedServices = services.map(s => {
                if (s.id === serviceId) {
                    return {
                        ...s,
                        adjustment: {
                            ...s.adjustment,
                            value: 0,
                        },
                    };
                }
                return s;
            });
            onChange(updatedServices);
            // Clear local input state
            setDiscountInputValues(prev => {
                const newState = { ...prev };
                delete newState[serviceId];
                return newState;
            });
            return;
        }

        const isMoneyType = ['FIXED_NET', 'FIXED_GROSS', 'SET_NET', 'SET_GROSS'].includes(service.adjustment.type);
        const parsedValue = parseFloat(inputValue);

        // If parsing fails, revert to current value
        if (isNaN(parsedValue)) {
            setDiscountInputValues(prev => {
                const newState = { ...prev };
                delete newState[serviceId];
                return newState;
            });
            return;
        }

        const numValue = isMoneyType
            ? Math.round(Math.abs(parsedValue) * 100)
            : parsedValue;

        const updatedServices = services.map(s => {
            if (s.id === serviceId) {
                return {
                    ...s,
                    adjustment: {
                        ...s.adjustment,
                        value: numValue,
                    },
                };
            }
            return s;
        });
        onChange(updatedServices);

        // Clear local input state so formatted value is shown
        setDiscountInputValues(prev => {
            const newState = { ...prev };
            delete newState[serviceId];
            return newState;
        });
    };

    const handleAddService = (service: Service) => {
        const newServiceLine: ServiceLineItem = {
            id: `${service.id}_${Date.now()}`,
            serviceId: service.id,
            serviceName: service.name,
            basePriceNet: service.basePriceNet,
            vatRate: service.vatRate,
            adjustment: {
                type: 'PERCENT',
                value: 0,
            },
            note: '',
            requireManualPrice: service.requireManualPrice,
        };
        onChange([...services, newServiceLine]);
    };

    const handleNoteChange = (serviceId: string, note: string) => {
        const updatedServices = services.map(s => {
            if (s.id === serviceId) {
                return { ...s, note };
            }
            return s;
        });
        onChange(updatedServices);
    };

    const handleRemoveService = (serviceId: string) => {
        onChange(services.filter(s => s.id !== serviceId));
    };

    const handleAddNewService = (searchQuery: string) => {
        setQuickServiceInitialName(searchQuery);
        setIsQuickServiceModalOpen(true);
    };

    const handleQuickServiceCreate = (service: { id?: string; name: string; basePriceNet: number; vatRate: 23 }) => {
        // If service was saved to database, refresh services list
        if (service.id) {
            queryClient.invalidateQueries({ queryKey: ['services'] });
        }

        // Create new service line item (with ID if saved to DB, or temporary ID if not)
        const newServiceLine: ServiceLineItem = {
            id: service.id ? `${service.id}_${Date.now()}` : `temp_${Date.now()}`,
            serviceId: service.id || `temp_${Date.now()}`,
            serviceName: service.name,
            basePriceNet: service.basePriceNet,
            vatRate: service.vatRate,
            adjustment: {
                type: 'PERCENT',
                value: 0,
            },
            note: '',
        };

        onChange([...services, newServiceLine]);
    };

    const totals = calculateTotals();

    const formatMoneyInput = (amount: number) => (amount / 100).toFixed(2);

    return (
        <>
            <ServiceAutocomplete onSelect={handleAddService} onAddNew={handleAddNewService} />

            <TableContainer>
                <Table>
                <Thead>
                    <tr>
                        <Th>Nazwa usługi</Th>
                        <Th>Cena bazowa</Th>
                        <Th>Rabat</Th>
                        <Th>Cena końcowa</Th>
                        <Th>Akcje</Th>
                    </tr>
                </Thead>
                <Tbody>
                    {services.map(service => {
                        const pricing = calculateServicePrice(service);
                        const isEditingPrice = editingPrices[service.id];
                        const isEditingNote = editingNotes[service.id];

                        return (
                            <Tr key={service.id}>
                                <Td>
                                    <ServiceName>{service.serviceName}</ServiceName>
                                    {isEditingNote ? (
                                        <NoteInput
                                            type="text"
                                            value={service.note || ''}
                                            onChange={(e) => handleNoteChange(service.id, e.target.value)}
                                            onBlur={() => setEditingNotes({ ...editingNotes, [service.id]: false })}
                                            placeholder="Dodaj notatkę..."
                                            autoFocus
                                        />
                                    ) : (
                                        <NoteDisplay
                                            onClick={() => setEditingNotes({ ...editingNotes, [service.id]: true })}
                                        >
                                            {service.note}
                                        </NoteDisplay>
                                    )}
                                </Td>

                                <Td>
                                    {service.basePriceNet === 0 || service.requireManualPrice ? (
                                        <CustomPriceLabel>
                                            Cena niestandardowa
                                        </CustomPriceLabel>
                                    ) : (
                                        <PriceCell>
                                            <div>
                                                <PriceLabel>Netto</PriceLabel>
                                                <PriceValue>
                                                    {formatCurrency(service.basePriceNet / 100)}
                                                </PriceValue>
                                            </div>
                                            <div>
                                                <PriceLabel>Brutto</PriceLabel>
                                                <PriceValue>
                                                    {formatCurrency((service.basePriceNet * (100 + service.vatRate)) / 10000)}
                                                </PriceValue>
                                            </div>
                                        </PriceCell>
                                    )}
                                </Td>

                                <Td>
                                    <DiscountCell>
                                        <DiscountSelect
                                            value={service.adjustment.type}
                                            onChange={(e) => handleDiscountTypeChange(service.id, e.target.value as AdjustmentType)}
                                        >
                                            <option value="PERCENT">Procent (%)</option>
                                            <option value="FIXED_NET">Rabat netto</option>
                                            <option value="FIXED_GROSS">Rabat brutto</option>
                                            <option value="SET_NET">Ustaw netto</option>
                                            <option value="SET_GROSS">Ustaw brutto</option>
                                        </DiscountSelect>
                                        <DiscountInputWrapper>
                                            <DiscountInput
                                                type="text"
                                                value={
                                                    focusedDiscountFields[service.id]
                                                        ? (discountInputValues[service.id] ?? '')
                                                        : (
                                                            service.adjustment.type === 'PERCENT'
                                                                ? service.adjustment.value === 0 ? '' : String(service.adjustment.value)
                                                                : service.adjustment.value === 0 ? '' : formatMoneyInput(Math.abs(service.adjustment.value))
                                                        )
                                                }
                                                onChange={(e) => handleDiscountValueChange(service.id, e.target.value)}
                                                onFocus={() => handleDiscountFocus(service.id)}
                                                onBlur={() => handleDiscountBlur(service.id)}
                                                placeholder="0.00"
                                            />
                                            <DiscountSuffix>
                                                {service.adjustment.type === 'PERCENT' ? '%' : 'PLN'}
                                            </DiscountSuffix>
                                        </DiscountInputWrapper>
                                        {pricing.discountAmountGross > 0 && (
                                            <DiscountAmount>
                                                Oszczędność: {formatCurrency(pricing.discountAmountGross / 100)}
                                            </DiscountAmount>
                                        )}
                                        {pricing.discountAmountGross < 0 && (
                                            <DiscountAmount style={{ color: '#dc2626', backgroundColor: '#fee' }}>
                                                Dopłata: {formatCurrency(Math.abs(pricing.discountAmountGross) / 100)}
                                            </DiscountAmount>
                                        )}
                                    </DiscountCell>
                                </Td>

                                <Td>
                                    <PriceCell>
                                        <div>
                                            <PriceLabel>Netto</PriceLabel>
                                            {isEditingPrice ? (
                                                <PriceInput
                                                    type="number"
                                                    step="0.01"
                                                    value={formatMoneyInput(pricing.finalPriceNet)}
                                                    onChange={(e) => handlePriceEdit(service.id, 'net', e.target.value)}
                                                    onBlur={() => setEditingPrices({ ...editingPrices, [service.id]: false })}
                                                    autoFocus
                                                />
                                            ) : (
                                                <PriceValue
                                                    $highlight={pricing.hasDiscount}
                                                    onClick={() => setEditingPrices({ ...editingPrices, [service.id]: true })}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {formatCurrency(pricing.finalPriceNet / 100)}
                                                </PriceValue>
                                            )}
                                        </div>
                                        <div>
                                            <PriceLabel>Brutto</PriceLabel>
                                            <PriceValue $highlight={pricing.hasDiscount}>
                                                {formatCurrency(pricing.finalPriceGross / 100)}
                                            </PriceValue>
                                        </div>
                                    </PriceCell>
                                </Td>

                                <Td>
                                    <ActionButton onClick={() => handleRemoveService(service.id)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </ActionButton>
                                </Td>
                            </Tr>
                        );
                    })}

                    <TotalRow>
                        <TotalLabel colSpan={3}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <span>Podsumowanie:</span>
                                {services.length > 0 && (
                                    <DiscountButton onClick={openDiscountModal}>
                                        🏷️ Rabatuj całość
                                    </DiscountButton>
                                )}
                            </div>
                        </TotalLabel>
                        <TotalValue>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                    <PriceLabel style={{ color: 'inherit' }}>Netto:</PriceLabel>
                                    <div style={{ fontWeight: 600 }}>{formatCurrency(totals.totalNet / 100)}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                    <PriceLabel style={{ color: 'inherit' }}>Brutto:</PriceLabel>
                                    <div style={{ fontWeight: 700 }}>{formatCurrency(totals.totalGross / 100)}</div>
                                </div>
                            </div>
                        </TotalValue>
                        <Td></Td>
                    </TotalRow>
                </Tbody>
            </Table>
        </TableContainer>

        {/* Quick Service Modal */}
        <QuickServiceModal
            isOpen={isQuickServiceModalOpen}
            onClose={() => setIsQuickServiceModalOpen(false)}
            onServiceCreate={handleQuickServiceCreate}
            initialServiceName={quickServiceInitialName}
        />

        {/* Discount Modal */}
        {isDiscountModalOpen && (
            <ModalOverlay onClick={(e) => { if (e.target === e.currentTarget) closeDiscountModal(); }}>
                <ModalCard role="dialog" aria-modal="true" aria-labelledby="discount-title">
                    <ModalHeader>
                        <ModalTitle id="discount-title">Rabatuj całość</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <p style={{ marginBottom: '16px' }}>
                            Podaj docelową kwotę całkowitą. System automatycznie obliczy i zastosuje procentowy rabat do wszystkich usług.
                        </p>
                        <RadioGroup>
                            <RadioLabel>
                                <input
                                    type="radio"
                                    name="priceType"
                                    value="gross"
                                    checked={discountPriceType === 'gross'}
                                    onChange={() => setDiscountPriceType('gross')}
                                />
                                Brutto
                            </RadioLabel>
                            <RadioLabel>
                                <input
                                    type="radio"
                                    name="priceType"
                                    value="net"
                                    checked={discountPriceType === 'net'}
                                    onChange={() => setDiscountPriceType('net')}
                                />
                                Netto
                            </RadioLabel>
                        </RadioGroup>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                            Docelowa kwota ({discountPriceType === 'gross' ? 'brutto' : 'netto'}):
                        </label>
                        <ModalInput
                            type="number"
                            step="0.01"
                            min="0"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            placeholder="0.00"
                            autoFocus
                        />
                        <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
                            Obecna suma {discountPriceType === 'gross' ? 'brutto' : 'netto'}:{' '}
                            <strong>
                                {formatCurrency((discountPriceType === 'gross' ? calculateTotals().totalGross : calculateTotals().totalNet) / 100)}
                            </strong>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <SecondaryBtn onClick={closeDiscountModal}>Anuluj</SecondaryBtn>
                        <PrimaryBtn onClick={handleApplyDiscount} disabled={!targetPrice || parseFloat(targetPrice) <= 0}>
                            Zastosuj rabat
                        </PrimaryBtn>
                    </ModalFooter>
                </ModalCard>
            </ModalOverlay>
        )}
    </>
    );
};