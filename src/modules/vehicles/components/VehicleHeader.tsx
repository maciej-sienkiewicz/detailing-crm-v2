// src/modules/vehicles/components/VehicleHeader.tsx

import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { Vehicle } from '../types';
import { t } from '@/common/i18n';

const HeaderBar = styled.header`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.xl};
    box-shadow: ${props => props.theme.shadows.sm};

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        flex-wrap: wrap;
        gap: ${props => props.theme.spacing.sm};
    }
`;

const BackButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
    background: white;
    color: ${props => props.theme.colors.textSecondary};
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;

    &:hover {
        border-color: var(--brand-primary);
        color: var(--brand-primary);
        background: #f0f9ff;
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const Divider = styled.div`
    width: 1px;
    height: 32px;
    background: ${props => props.theme.colors.border};
    flex-shrink: 0;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: none;
    }
`;

const VehicleIdentity = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    flex: 1;
    min-width: 0;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        flex-basis: calc(100% - 52px);
    }
`;

const LicensePlateBox = styled.div`
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    border-radius: ${props => props.theme.radii.md};
    border: 2px solid #475569;
    flex-shrink: 0;
`;

const LicensePlateText = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: white;
    letter-spacing: 2px;
    font-family: 'SF Mono', 'Fira Code', monospace;
`;

const VehicleInfo = styled.div`
    min-width: 0;
`;

const VehicleName = styled.h1`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.md};
    }
`;

const VehicleMeta = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    margin-top: 2px;
`;

const MetaText = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const StatusBadge = styled.div<{ $status: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;

    ${props => {
        if (props.$status === 'active') return 'background: #dcfce7; color: #166534;';
        if (props.$status === 'sold') return 'background: #fef3c7; color: #92400e;';
        return 'background: #f3f4f6; color: #6b7280;';
    }}
`;

const StatusDot = styled.div<{ $status: string }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;

    ${props => {
        if (props.$status === 'active') return 'background: #16a34a;';
        if (props.$status === 'sold') return 'background: #d97706;';
        return 'background: #9ca3af;';
    }}
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    flex-shrink: 0;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        width: 100%;
        justify-content: flex-end;
    }
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    ${props => props.$primary ? `
        background: var(--brand-primary);
        color: white;
        border: none;
        box-shadow: 0 1px 3px rgba(14, 165, 233, 0.3);

        &:hover {
            opacity: 0.9;
            box-shadow: 0 2px 6px rgba(14, 165, 233, 0.4);
        }
    ` : `
        background: white;
        color: ${props.theme.colors.textSecondary};
        border: 1px solid ${props.theme.colors.border};

        &:hover {
            border-color: var(--brand-primary);
            color: var(--brand-primary);
            background: #f0f9ff;
        }
    `}

    svg {
        width: 16px;
        height: 16px;
    }
`;

interface VehicleHeaderProps {
    vehicle: Vehicle;
    onEditVehicle: () => void;
    onEditOwners: () => void;
}

export const VehicleHeader = ({ vehicle, onEditVehicle, onEditOwners }: VehicleHeaderProps) => {
    const navigate = useNavigate();

    const vehicleNameParts = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');
    const yearSuffix = vehicle.yearOfProduction ? ` (${vehicle.yearOfProduction})` : '';

    const engineLabels: Record<string, string> = {
        gasoline: 'Benzyna',
        diesel: 'Diesel',
        hybrid: 'Hybryda',
        electric: 'Elektryk',
    };

    const metaParts = [
        vehicle.color,
        vehicle.currentMileage ? `${vehicle.currentMileage.toLocaleString()} km` : null,
    ].filter(Boolean).join('  ·  ');

    return (
        <HeaderBar>
            <BackButton onClick={() => navigate('/vehicles')} title="Powrót do listy">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </BackButton>

            <Divider />

            <VehicleIdentity>
                <LicensePlateBox>
                    <LicensePlateText>{vehicle.licensePlate || '—'}</LicensePlateText>
                </LicensePlateBox>

                <VehicleInfo>
                    <VehicleName>{vehicleNameParts}{yearSuffix}</VehicleName>
                    <VehicleMeta>
                        <MetaText>{metaParts}</MetaText>
                    </VehicleMeta>
                </VehicleInfo>
            </VehicleIdentity>

            <StatusBadge $status={vehicle.status}>
                <StatusDot $status={vehicle.status} />
                {t.vehicles.detail.status[vehicle.status]}
            </StatusBadge>

            <Actions>
                <ActionButton onClick={onEditOwners}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Właściciele
                </ActionButton>
                <ActionButton $primary onClick={onEditVehicle}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    {t.common.edit}
                </ActionButton>
            </Actions>
        </HeaderBar>
    );
};
