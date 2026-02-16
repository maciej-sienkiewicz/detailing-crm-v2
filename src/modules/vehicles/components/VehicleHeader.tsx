// src/modules/vehicles/components/VehicleHeader.tsx

import { Link } from 'react-router-dom';
import styled from 'styled-components';
import type { Vehicle, VehiclePhoto } from '../types';
import { formatCurrency } from '@/common/utils';
import { t } from '@/common/i18n';
import { VehicleMiniGallery } from './VehicleMiniGallery';

const HeaderContainer = styled.header`
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.xl};
    padding: ${props => props.theme.spacing.lg};
    box-shadow: ${props => props.theme.shadows.md};
`;

const HeaderTop = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const VehicleIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.lg};
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
    font-size: 24px;
`;

const VehicleDetails = styled.div`
    flex: 1;
`;

const VehicleTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    margin-bottom: 4px;
`;

const LicensePlate = styled.h1`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: 1.5px;
`;

const StatusBadge = styled.div<{ $status: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
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

const VehicleName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const ContentGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-columns: 1fr 320px;
    }
`;

const LeftColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.sm};
`;

const StatCard = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.sm};
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
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const StatSubvalue = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    margin-top: 2px;
`;

const OwnersSection = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.sm};
`;

const OwnersSectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${props => props.theme.spacing.sm};
`;

const OwnersSectionTitle = styled.h4`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    text-transform: uppercase;
    color: ${props => props.theme.colors.textMuted};
    letter-spacing: 0.05em;
`;

const OwnerCount = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const OwnersList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const OwnerItem = styled(Link)`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.xs};
    border-radius: ${props => props.theme.radii.sm};
    transition: background 0.2s ease;
    text-decoration: none;

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
    }
`;

const OwnerAvatar = styled.div`
    width: 32px;
    height: 32px;
    border-radius: ${props => props.theme.radii.full};
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 700;
    color: white;
`;

const OwnerInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const OwnerName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const OwnerRole = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const GalleryColumn = styled.div`
    height: 400px;

    @media (max-width: ${props => props.theme.breakpoints.lg}) {
        height: 300px;
    }
`;

interface VehicleHeaderProps {
    vehicle: Vehicle;
    photos: VehiclePhoto[];
}

export const VehicleHeader = ({ vehicle, photos }: VehicleHeaderProps) => {
    // Safe fallbacks for potentially missing data from API
    const stats = vehicle.stats ?? ({} as any);
    const totalSpent = stats.totalSpent ?? { grossAmount: 0, netAmount: 0, currency: 'PLN' };
    const averageVisitCost = stats.averageVisitCost ?? { grossAmount: 0, currency: totalSpent.currency };
    const totalVisits = typeof stats.totalVisits === 'number' ? stats.totalVisits : 0;
    const lastVisitDate = stats.lastVisitDate ?? null;

    const licensePlate = vehicle.licensePlate ?? '—';
    const vehicleNameParts = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');
    const yearSuffix = vehicle.yearOfProduction ? ` (${vehicle.yearOfProduction})` : '';

    return (
        <HeaderContainer>
            <HeaderTop>
                <VehicleIcon>🚗</VehicleIcon>
                <VehicleDetails>
                    <VehicleTitleRow>
                        <LicensePlate>{licensePlate}</LicensePlate>
                        <StatusBadge $status={vehicle.status}>
                            {t.vehicles.detail.status[vehicle.status]}
                        </StatusBadge>
                    </VehicleTitleRow>
                    <VehicleName>
                        {vehicleNameParts}{yearSuffix}
                    </VehicleName>
                </VehicleDetails>
            </HeaderTop>

            <ContentGrid>
                <LeftColumn>
                    <StatsGrid>
                        <StatCard>
                            <StatLabel>{t.vehicles.detail.stats.totalVisits}</StatLabel>
                            <StatValue>{totalVisits}</StatValue>
                        </StatCard>

                        <StatCard>
                            <StatLabel>{t.vehicles.detail.stats.lastVisit}</StatLabel>
                            <StatValue>
                                {lastVisitDate
                                    ? new Date(lastVisitDate).toLocaleDateString('pl-PL', {
                                        day: '2-digit',
                                        month: '2-digit'
                                    })
                                    : '—'
                                }
                            </StatValue>
                        </StatCard>

                        <StatCard>
                            <StatLabel>{t.vehicles.detail.stats.totalSpent}</StatLabel>
                            <StatValue>
                                {formatCurrency(totalSpent.grossAmount, totalSpent.currency)}
                            </StatValue>
                            <StatSubvalue>
                                {formatCurrency(totalSpent.netAmount, totalSpent.currency)} netto
                            </StatSubvalue>
                        </StatCard>

                        <StatCard>
                            <StatLabel>{t.vehicles.detail.stats.averageCost}</StatLabel>
                            <StatValue>
                                {formatCurrency(averageVisitCost.grossAmount, averageVisitCost.currency)}
                            </StatValue>
                        </StatCard>
                    </StatsGrid>

                    <OwnersSection>
                        <OwnersSectionHeader>
                            <OwnersSectionTitle>Właściciele</OwnersSectionTitle>
                            <OwnerCount>{vehicle.owners.length}</OwnerCount>
                        </OwnersSectionHeader>
                        <OwnersList>
                            {vehicle.owners.map(owner => {
                                const initials = owner.customerName
                                    .split(' ')
                                    .map(n => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2);

                                return (
                                    <OwnerItem key={owner.customerId} to={`/customers/${owner.customerId}`}>
                                        <OwnerAvatar>{initials}</OwnerAvatar>
                                        <OwnerInfo>
                                            <OwnerName>{owner.customerName}</OwnerName>
                                            <OwnerRole>
                                                {t.vehicles.detail.owners.role[owner.role]}
                                            </OwnerRole>
                                        </OwnerInfo>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 18l6-6-6-6"/>
                                        </svg>
                                    </OwnerItem>
                                );
                            })}
                        </OwnersList>
                    </OwnersSection>
                </LeftColumn>

                <GalleryColumn>
                    <VehicleMiniGallery photos={photos} />
                </GalleryColumn>
            </ContentGrid>
        </HeaderContainer>
    );
};
