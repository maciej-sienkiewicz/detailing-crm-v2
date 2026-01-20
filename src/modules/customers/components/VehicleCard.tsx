// src/modules/customers/components/VehicleCard.tsx

import styled from 'styled-components';
import type { Vehicle, EngineType } from '../types';
import { formatDate, formatNumber } from '@/common/utils';
import { t } from '@/common/i18n';

const Card = styled.article`
    background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.md};
    transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 70%, white) 100%);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.3s ease;
    }

    &:hover {
        border-color: var(--brand-primary);
        box-shadow: ${props => props.theme.shadows.lg};
        transform: translateY(-2px);

        &::before {
            transform: scaleX(1);
        }
    }

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.lg};
    }
`;

const CardHeader = styled.header`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const VehicleInfo = styled.div`
    flex: 1;
`;

const VehicleName = styled.h3`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: -0.01em;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.lg};
    }
`;

const VehicleYear = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    font-weight: 500;
`;

const StatusBadge = styled.div<{ $status: Vehicle['status'] }>`
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
        const styles = {
            active: 'background: #dcfce7; color: #166534;',
            sold: 'background: #fef3c7; color: #92400e;',
            archived: 'background: #f3f4f6; color: #6b7280;',
        };
        return styles[props.$status];
    }}
`;

const VehicleDetails = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.sm};
    margin-bottom: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const DetailItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const DetailLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
`;

const DetailValue = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
`;

const EngineBadge = styled.span<{ $type: Vehicle['engineType'] }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;

    ${props => {
        const styles: Record<EngineType, string> = {
            GASOLINE: 'background: #fee2e2; color: #991b1b;',
            DIESEL: 'background: #fef3c7; color: #92400e;',
            HYBRID: 'background: #dbeafe; color: #1e40af;',
            ELECTRIC: 'background: #dcfce7; color: #166534;',
        };
        return styles[props.$type];
    }}
`;

const ServiceInfo = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.xs};
    padding-top: ${props => props.theme.spacing.md};
    border-top: 1px solid ${props => props.theme.colors.border};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const ServiceItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const ServiceIcon = styled.div<{ $variant: 'inspection' | 'service' }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    flex-shrink: 0;

    ${props => props.$variant === 'inspection'
            ? 'background: #fef3c7; color: #92400e;'
            : 'background: #dbeafe; color: #1e40af;'
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const ServiceText = styled.div`
    display: flex;
    flex-direction: column;
`;

const ServiceLabel = styled.span`
    font-size: 10px;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    line-height: 1;
`;

const ServiceDate = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.text};
    font-weight: 500;
    margin-top: 2px;
`;

interface VehicleCardProps {
    vehicle: Vehicle;
}

export const VehicleCard = ({ vehicle }: VehicleCardProps) => {
    return (
        <Card>
            <CardHeader>
                <VehicleInfo>
                    <VehicleName>
                        {vehicle.make} {vehicle.model}
                    </VehicleName>
                    <VehicleYear>{t.customers.detail.vehicleCard.year} {vehicle.year}</VehicleYear>
                </VehicleInfo>
                <StatusBadge $status={vehicle.status}>
                    {t.customers.detail.vehicleCard.status[vehicle.status]}
                </StatusBadge>
            </CardHeader>

            <VehicleDetails>
                <DetailItem>
                    <DetailLabel>{t.customers.detail.vehicleCard.licensePlate}</DetailLabel>
                    <DetailValue>{vehicle.licensePlate}</DetailValue>
                </DetailItem>

                <DetailItem>
                    <DetailLabel>{t.customers.detail.vehicleCard.color}</DetailLabel>
                    <DetailValue>{vehicle.color}</DetailValue>
                </DetailItem>

                <DetailItem>
                    <DetailLabel>{t.customers.detail.vehicleCard.mileage}</DetailLabel>
                    <DetailValue>{formatNumber(vehicle.mileage)} km</DetailValue>
                </DetailItem>
            </VehicleDetails>

            <ServiceInfo>
                {vehicle.nextInspectionDate && (
                    <ServiceItem>
                        <ServiceIcon $variant="inspection">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 11l3 3L22 4"/>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                            </svg>
                        </ServiceIcon>
                        <ServiceText>
                            <ServiceLabel>{t.customers.detail.vehicleCard.inspection}</ServiceLabel>
                            <ServiceDate>{formatDate(vehicle.nextInspectionDate)}</ServiceDate>
                        </ServiceText>
                    </ServiceItem>
                )}

                {vehicle.nextServiceDate && (
                    <ServiceItem>
                        <ServiceIcon $variant="service">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                        </ServiceIcon>
                        <ServiceText>
                            <ServiceLabel>{t.customers.detail.vehicleCard.service}</ServiceLabel>
                            <ServiceDate>{formatDate(vehicle.nextServiceDate)}</ServiceDate>
                        </ServiceText>
                    </ServiceItem>
                )}
            </ServiceInfo>
        </Card>
    );
};
