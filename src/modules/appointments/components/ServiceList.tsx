import styled from 'styled-components';
import { useState } from 'react';
import { formatMoneyAmount, usePriceCalculator } from '../hooks/usePriceCalculator';
import type { ServiceLineItem, Service, AdjustmentType } from '../types';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const ServiceItem = styled.div`
    background-color: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.lg};
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const ServiceHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const ServiceTitle = styled.h3`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0;
`;

const RemoveButton = styled.button`
    background: none;
    border: none;
    color: ${props => props.theme.colors.error};
    cursor: pointer;
    font-size: ${props => props.theme.fontSizes.lg};
    padding: ${props => props.theme.spacing.sm};
    line-height: 1;
    transition: transform ${props => props.theme.transitions.fast};

    &:hover {
        transform: scale(1.2);
    }
`;

const ServiceDetails = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.md};
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 1fr 1fr;
    }
`;

const DetailGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const Label = styled.label`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textSecondary};
`;

const Select = styled.select`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background-color: ${props => props.theme.colors.surface};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
    }
`;

const Input = styled.input`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
    }
`;

const TextArea = styled.textarea`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-family: inherit;
    resize: vertical;
    min-height: 60px;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
    }
`;

const PriceSummary = styled.div`
    margin-top: ${props => props.theme.spacing.md};
    padding-top: ${props => props.theme.spacing.md};
    border-top: 1px solid ${props => props.theme.colors.border};
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const PriceLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const PriceValue = styled.span`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
`;

const AddButton = styled.button`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.normal};
    box-shadow: ${props => props.theme.shadows.sm};

    &:hover {
        transform: translateY(-2px);
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const ServiceSelector = styled.div`
    margin-bottom: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.lg};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
`;

interface ServiceListProps {
    services: ServiceLineItem[];
    availableServices: Service[];
    onChange: (services: ServiceLineItem[]) => void;
}

export const ServiceList = ({ services, availableServices, onChange }: ServiceListProps) => {
    const [selectedServiceId, setSelectedServiceId] = useState('');

    const handleAddService = () => {
        const service = availableServices.find(s => s.id === selectedServiceId);
        if (!service) return;

        const newService: ServiceLineItem = {
            id: `${Date.now()}`,
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

        onChange([...services, newService]);
        setSelectedServiceId('');
    };

    const handleRemoveService = (id: string) => {
        onChange(services.filter(s => s.id !== id));
    };

    const handleUpdateService = (id: string, updates: Partial<ServiceLineItem>) => {
        onChange(services.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    return (
        <Container>
            <ServiceSelector>
                <Label>Dodaj usługę</Label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <Select
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        style={{ flex: 1 }}
                    >
                        <option value="">Wybierz usługę...</option>
                        {availableServices.map((service) => (
                            <option key={service.id} value={service.id}>
                                {service.name} - {formatMoneyAmount(service.basePriceNet)} PLN
                            </option>
                        ))}
                    </Select>
                    <AddButton onClick={handleAddService} disabled={!selectedServiceId}>
                        Dodaj
                    </AddButton>
                </div>
            </ServiceSelector>

            {services.length === 0 ? (
                <EmptyState>
                    Nie dodano jeszcze żadnych usług
                </EmptyState>
            ) : (
                services.map((service) => (
                    <ServiceItemComponent
                        key={service.id}
                        service={service}
                        onRemove={() => handleRemoveService(service.id)}
                        onUpdate={(updates) => handleUpdateService(service.id, updates)}
                    />
                ))
            )}
        </Container>
    );
};

interface ServiceItemComponentProps {
    service: ServiceLineItem;
    onRemove: () => void;
    onUpdate: (updates: Partial<ServiceLineItem>) => void;
}

const ServiceItemComponent = ({ service, onRemove, onUpdate }: ServiceItemComponentProps) => {
    const calculation = usePriceCalculator(
        service.basePriceNet,
        service.vatRate,
        service.adjustment
    );

    const getAdjustmentTypeLabel = (type: AdjustmentType): string => {
        switch (type) {
            case 'PERCENT': return 'Procent (%)';
            case 'FIXED_NET': return 'Stała kwota netto';
            case 'FIXED_GROSS': return 'Stała kwota brutto';
            case 'SET_NET': return 'Ustaw cenę netto';
            case 'SET_GROSS': return 'Ustaw cenę brutto';
        }
    };

    return (
        <ServiceItem>
            <ServiceHeader>
                <ServiceTitle>{service.serviceName}</ServiceTitle>
                <RemoveButton onClick={onRemove}>×</RemoveButton>
            </ServiceHeader>

            <ServiceDetails>
                <DetailGroup>
                    <Label>Typ rabatu/korekty</Label>
                    <Select
                        value={service.adjustment.type}
                        onChange={(e) =>
                            onUpdate({
                                adjustment: {
                                    ...service.adjustment,
                                    type: e.target.value as AdjustmentType,
                                },
                            })
                        }
                    >
                        <option value="PERCENT">Procent (%)</option>
                        <option value="FIXED_NET">Stała kwota netto</option>
                        <option value="FIXED_GROSS">Stała kwota brutto</option>
                        <option value="SET_NET">Ustaw cenę netto</option>
                        <option value="SET_GROSS">Ustaw cenę brutto</option>
                    </Select>
                </DetailGroup>

                <DetailGroup>
                    <Label>Wartość</Label>
                    <Input
                        type="number"
                        step="0.01"
                        value={
                            service.adjustment.type === 'PERCENT'
                                ? service.adjustment.value
                                : formatMoneyAmount(service.adjustment.value)
                        }
                        onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            onUpdate({
                                adjustment: {
                                    ...service.adjustment,
                                    value:
                                        service.adjustment.type === 'PERCENT'
                                            ? value
                                            : Math.round(value * 100),
                                },
                            });
                        }}
                        placeholder="0.00"
                    />
                </DetailGroup>

                <DetailGroup style={{ gridColumn: '1 / -1' }}>
                    <Label>Notatka (opcjonalnie)</Label>
                    <TextArea
                        value={service.note || ''}
                        onChange={(e) => onUpdate({ note: e.target.value })}
                        placeholder="Dodatkowe informacje o usłudze..."
                    />
                </DetailGroup>
            </ServiceDetails>

            <PriceSummary>
                <div>
                    <PriceLabel>Cena bazowa: {formatMoneyAmount(service.basePriceNet)} PLN</PriceLabel>
                </div>
                <div>
                    <PriceValue>{formatMoneyAmount(calculation.finalPriceGross)} PLN brutto</PriceValue>
                </div>
            </PriceSummary>
        </ServiceItem>
    );
};