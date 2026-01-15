// src/modules/checkin/components/EditableServicesTable.tsx

import { useState } from 'react';
import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import { Select, Input } from '@/common/components/Form';
import { ServiceAutocomplete } from './ServiceAutocomplete';
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
`;

const DiscountInput = styled(Input)`
    width: 100%;
    max-width: 120px;
    text-align: right;
    font-feature-settings: 'tnum';
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

interface EditableServicesTableProps {
    services: ServiceLineItem[];
    onChange: (services: ServiceLineItem[]) => void;
}

export const EditableServicesTable = ({ services, onChange }: EditableServicesTableProps) => {
    const [editingPrices, setEditingPrices] = useState<Record<string, boolean>>({});
    const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});

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

        const vatAmount = Math.round((finalPriceNet * vatRate) / 100);
        const finalPriceGross = finalPriceNet + vatAmount;

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
    };

    const handleDiscountValueChange = (serviceId: string, value: string) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        const isMoneyType = ['FIXED_NET', 'FIXED_GROSS', 'SET_NET', 'SET_GROSS'].includes(service.adjustment.type);
        const numValue = isMoneyType
            ? Math.round(Math.abs(parseFloat(value)) * 100) || 0
            : parseFloat(value) || 0;

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

    const totals = calculateTotals();

    const formatMoneyInput = (amount: number) => (amount / 100).toFixed(2);

    return (
        <>
            <ServiceAutocomplete onSelect={handleAddService} />

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
                                        <DiscountInput
                                            type="number"
                                            step="0.01"
                                            value={
                                                service.adjustment.type === 'PERCENT'
                                                    ? service.adjustment.value
                                                    : formatMoneyInput(Math.abs(service.adjustment.value))
                                            }
                                            onChange={(e) => handleDiscountValueChange(service.id, e.target.value)}
                                            placeholder="0.00"
                                        />
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
                        <TotalLabel colSpan={3}>Podsumowanie:</TotalLabel>
                        <TotalValue>
                            <div style={{ marginBottom: '4px' }}>
                                <PriceLabel style={{ color: 'inherit' }}>Netto</PriceLabel>
                                <div>{formatCurrency(totals.totalNet / 100)}</div>
                            </div>
                            <div style={{ marginBottom: '4px' }}>
                                <PriceLabel style={{ color: 'inherit' }}>VAT</PriceLabel>
                                <div>{formatCurrency(totals.totalVat / 100)}</div>
                            </div>
                            <div style={{ fontSize: '1.5rem', marginTop: '8px' }}>
                                <PriceLabel style={{ color: 'inherit' }}>Do zapłaty</PriceLabel>
                                <div>{formatCurrency(totals.totalGross / 100)}</div>
                            </div>
                        </TotalValue>
                        <Td></Td>
                    </TotalRow>
                </Tbody>
            </Table>
        </TableContainer>
    </>
    );
};