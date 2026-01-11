import styled from 'styled-components';
import type { VehicleListItem } from '../types';
import { formatCurrency, formatDate } from '@/common/utils';
import { t } from '@/common/i18n';

const Card = styled.article`
    background: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    border-left: 4px solid var(--brand-primary);
    padding: ${props => props.theme.spacing.md};
    transition: box-shadow 0.2s ease;
    cursor: pointer;

    &:hover {
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const CardHeader = styled.header`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.sm};
`;

const LicensePlate = styled.div`
    display: inline-flex;
    align-items: center;
    padding: 8px 14px;
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 90%, black) 100%);
    color: white;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    border-radius: ${props => props.theme.radii.md};
    letter-spacing: 1px;
`;

const VehicleName = styled.div`
    margin-top: 6px;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const VisitBadge = styled.span`
    background: var(--brand-primary);
    color: white;
    font-size: ${props => props.theme.fontSizes.xs};
    padding: 4px 10px;
    border-radius: ${props => props.theme.radii.full};
    font-weight: 600;
`;

const OwnersSection = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: ${props => props.theme.spacing.sm};
`;

const OwnerTag = styled.span<{ $role: string }>`
    padding: 4px 10px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;

    ${props => {
    if (props.$role === 'PRIMARY') return 'background: #dcfce7; color: #166534;';
    if (props.$role === 'COMPANY') return 'background: #dbeafe; color: #1e40af;';
    return 'background: #f3f4f6; color: #6b7280;';
}}
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.xs};
    padding-top: ${props => props.theme.spacing.sm};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const StatItem = styled.div`
    display: flex;
    flex-direction: column;
`;

const StatLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const StatValue = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

interface VehicleCardProps {
    vehicle: VehicleListItem;
    onCardClick?: (vehicleId: string) => void;
}

export const VehicleCard = ({ vehicle, onCardClick }: VehicleCardProps) => (
    <Card onClick={() => onCardClick?.(vehicle.id)}>
        <CardHeader>
            <div>
                <LicensePlate>{vehicle.licensePlate}</LicensePlate>
                <VehicleName>
                    {vehicle.brand} {vehicle.model} ({vehicle.yearOfProduction})
                </VehicleName>
            </div>
            <VisitBadge>{vehicle.stats.totalVisits}</VisitBadge>
        </CardHeader>

        <OwnersSection>
            {vehicle.owners.map(owner => (
                <OwnerTag key={owner.customerId} $role={owner.role}>
                    {owner.customerName}
                </OwnerTag>
            ))}
        </OwnersSection>

        <StatsGrid>
            <StatItem>
                <StatLabel>{t.vehicles.card.lastVisit}</StatLabel>
                <StatValue>
                    {vehicle.stats.lastVisitDate ? formatDate(vehicle.stats.lastVisitDate) : '—'}
                </StatValue>
            </StatItem>
            <StatItem>
                <StatLabel>{t.vehicles.card.totalSpent}</StatLabel>
                <StatValue>
                    {formatCurrency(
                        vehicle.stats.totalSpent.grossAmount,
                        vehicle.stats.totalSpent.currency
                    )}
                </StatValue>
            </StatItem>
        </StatsGrid>
    </Card>
);