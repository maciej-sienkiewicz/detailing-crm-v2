import { useState } from 'react';
import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';
import { Input, Label, FieldGroup } from '@/common/components/Form';
import { formatCurrency } from '@/common/utils';
import type { VehicleInfo, CustomerInfo } from '../types';

const Card = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    box-shadow: ${props => props.theme.shadows.sm};
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.md};
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 2px solid ${props => props.theme.colors.border};
`;

const CardIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.lg};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
    box-shadow: ${props => props.theme.shadows.md};
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const InfoItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const InfoLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
`;

const InfoValue = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    font-weight: 500;
`;

const ToggleSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
`;

const StatBadge = styled.div<{ $variant: 'success' | 'info' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;

    ${props => props.$variant === 'success' && `
        background: #dcfce7;
        color: #166534;
    `}

    ${props => props.$variant === 'info' && `
        background: #dbeafe;
        color: #1e40af;
    `}
`;

interface VehicleInfoCardProps {
    vehicle: VehicleInfo;
    mileageAtArrival?: number;
    keysHandedOver: boolean;
    documentsHandedOver: boolean;
    onMileageChange: (mileage: number) => void;
    onKeysToggle: (checked: boolean) => void;
    onDocumentsToggle: (checked: boolean) => void;
}

export const VehicleInfoCard = ({
                                    vehicle,
                                    mileageAtArrival,
                                    keysHandedOver,
                                    documentsHandedOver,
                                    onMileageChange,
                                    onKeysToggle,
                                    onDocumentsToggle,
                                }: VehicleInfoCardProps) => {
    const [mileage, setMileage] = useState(mileageAtArrival?.toString() || '');

    const handleMileageBlur = () => {
        const parsed = parseInt(mileage, 10);
        if (!isNaN(parsed) && parsed > 0) {
            onMileageChange(parsed);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardIcon>🚗</CardIcon>
                <CardTitle>Informacje o pojeździe</CardTitle>
            </CardHeader>

            <InfoGrid>
                <InfoItem>
                    <InfoLabel>Marka i model</InfoLabel>
                    <InfoValue>{vehicle.brand} {vehicle.model}</InfoValue>
                </InfoItem>
                <InfoItem>
                    <InfoLabel>Rok produkcji</InfoLabel>
                    <InfoValue>{vehicle.yearOfProduction}</InfoValue>
                </InfoItem>
                <InfoItem>
                    <InfoLabel>Kolor</InfoLabel>
                    <InfoValue>{vehicle.color}</InfoValue>
                </InfoItem>
            </InfoGrid>

            <div style={{ marginTop: '16px' }}>
                <FieldGroup>
                    <Label>Przebieg przy przyjęciu (km)</Label>
                    <Input
                        type="number"
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        onBlur={handleMileageBlur}
                        placeholder="Wpisz przebieg..."
                    />
                </FieldGroup>
            </div>

            <ToggleSection style={{ marginTop: '16px' }}>
                <Toggle
                    checked={keysHandedOver}
                    onChange={onKeysToggle}
                    label="Kluczyki przekazane"
                />
                <Toggle
                    checked={documentsHandedOver}
                    onChange={onDocumentsToggle}
                    label="Dokumenty przekazane"
                />
            </ToggleSection>
        </Card>
    );
};

interface CustomerInfoCardProps {
    customer: CustomerInfo;
}

export const CustomerInfoCard = ({ customer }: CustomerInfoCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardIcon>👤</CardIcon>
                <CardTitle>Informacje o kliencie</CardTitle>
            </CardHeader>

            <InfoGrid>
                <InfoItem>
                    <InfoLabel>Imię i nazwisko</InfoLabel>
                    <InfoValue>{customer.firstName} {customer.lastName}</InfoValue>
                </InfoItem>
                {customer.companyName && (
                    <InfoItem>
                        <InfoLabel>Firma</InfoLabel>
                        <InfoValue>{customer.companyName}</InfoValue>
                    </InfoItem>
                )}
                <InfoItem>
                    <InfoLabel>Email</InfoLabel>
                    <InfoValue>{customer.email}</InfoValue>
                </InfoItem>
                <InfoItem>
                    <InfoLabel>Telefon</InfoLabel>
                    <InfoValue>{customer.phone}</InfoValue>
                </InfoItem>
            </InfoGrid>

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <StatBadge $variant="success">
                    💰 LTV: {formatCurrency(
                    customer.stats.totalSpent.grossAmount / 100,
                    customer.stats.totalSpent.currency
                )}
                </StatBadge>
                <StatBadge $variant="info">
                    📊 {customer.stats.totalVisits} wizyt
                </StatBadge>
                <StatBadge $variant="info">
                    🚗 {customer.stats.vehiclesCount} pojazdów
                </StatBadge>
            </div>
        </Card>
    );
};