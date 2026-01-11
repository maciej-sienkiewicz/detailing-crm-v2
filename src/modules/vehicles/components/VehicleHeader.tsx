// src/modules/vehicles/components/VehicleHeader.tsx

import styled from 'styled-components';
import type { Vehicle } from '../types';
import { formatCurrency } from '@/common/utils';
import { t } from '@/common/i18n';

const HeaderContainer = styled.header`
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.xl};
    padding: ${props => props.theme.spacing.lg};
    box-shadow: ${props => props.theme.shadows.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

const HeaderTop = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
    }
`;

const VehicleInfo = styled.div`
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.md};
`;

const VehicleIcon = styled.div`
    width: 64px;
    height: 64px;
    border-radius: ${props => props.theme.radii.lg};
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        width: 80px;
        height: 80px;
    }

    svg {
        width: 32px;
        height: 32px;
        color: white;

        @media (min-width: ${props => props.theme.breakpoints.md}) {
            width: 40px;
            height: 40px;
        }
    }
`;

const VehicleDetails = styled.div`
    flex: 1;
`;

const LicensePlate = styled.h1`
    margin: 0 0 ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: 2px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xxl};
    }
`;

const VehicleName = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.textSecondary};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const StatusBadge = styled.div<{ $status: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;

    ${props => {
        if (props.$status === 'active') return 'background: #dcfce7; color: #166534;';
        if (props.$status === 'sold') return 'background: #fef3c7; color: #92400e;';
        return 'background: #f3f4f6; color: #6b7280;';
    }}
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(4, 1fr);
    }

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        gap: ${props => props.theme.spacing.lg};
    }
`;

const StatCard = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.md};
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const StatLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
`;

const StatValue = styled.div`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 700;
    color: ${props => props.theme.colors.text};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xl};
    }
`;

const StatSubvalue = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    margin-top: 2px;
`;

interface VehicleHeaderProps {
    vehicle: Vehicle;
}

export const VehicleHeader = ({ vehicle }: VehicleHeaderProps) => {
    return (
        <HeaderContainer>
            <HeaderTop>
                <VehicleInfo>
                    <VehicleIcon>🚗</VehicleIcon>
                    <VehicleDetails>
                        <LicensePlate>{vehicle.licensePlate}</LicensePlate>
                        <VehicleName>
                            {vehicle.brand} {vehicle.model} ({vehicle.yearOfProduction})
                        </VehicleName>
                        <StatusBadge $status={vehicle.status}>
                            {t.vehicles.detail.status[vehicle.status]}
                        </StatusBadge>
                    </VehicleDetails>
                </VehicleInfo>
            </HeaderTop>

            <StatsGrid>
                <StatCard>
                    <StatLabel>{t.vehicles.detail.stats.totalVisits}</StatLabel>
                    <StatValue>{vehicle.stats.totalVisits}</StatValue>
                </StatCard>

                <StatCard>
                    <StatLabel>{t.vehicles.detail.stats.totalSpent}</StatLabel>
                    <StatValue>
                        {formatCurrency(vehicle.stats.totalSpent.grossAmount, vehicle.stats.totalSpent.currency)}
                    </StatValue>
                    <StatSubvalue>
                        {formatCurrency(vehicle.stats.totalSpent.netAmount, vehicle.stats.totalSpent.currency)} netto
                    </StatSubvalue>
                </StatCard>

                <StatCard>
                    <StatLabel>{t.vehicles.detail.stats.averageCost}</StatLabel>
                    <StatValue>
                        {formatCurrency(vehicle.stats.averageVisitCost.grossAmount, vehicle.stats.averageVisitCost.currency)}
                    </StatValue>
                </StatCard>

                <StatCard>
                    <StatLabel>{t.vehicles.detail.stats.lastVisit}</StatLabel>
                    <StatValue>
                        {vehicle.stats.lastVisitDate
                            ? new Date(vehicle.stats.lastVisitDate).toLocaleDateString('pl-PL')
                            : '—'
                        }
                    </StatValue>
                </StatCard>
            </StatsGrid>
        </HeaderContainer>
    );
};