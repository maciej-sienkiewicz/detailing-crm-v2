// src/modules/vehicles/components/VehicleHeader.tsx

import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { Vehicle } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { formatCurrency } from '@/common/utils';
import { t } from '@/common/i18n';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const paintLabels: Record<string, string> = {
    metallic: 'Metalik',
    matte:    'Mat',
    pearl:    'Perła',
    solid:    'Akryl',
};

// ─── Styled components ────────────────────────────────────────────────────────

const HeroHeader = styled.header`
    position: sticky;
    top: 0;
    z-index: 100;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0d1f38 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.28);

    &::before {
        content: '';
        position: absolute;
        top: -90px;
        right: 80px;
        width: 380px;
        height: 380px;
        background: radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 65%);
        pointer-events: none;
    }
`;

const HeaderContent = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding: 14px 28px 12px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 16px 32px 14px;
    }

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        flex-wrap: wrap;
        gap: 10px;
        padding: 12px 20px 10px;
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
`;

const BreadcrumbRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
`;

const BackBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: rgba(148, 163, 184, 0.65);
    transition: color ${st.transition};

    &:hover { color: rgba(241, 245, 249, 0.9); }
    svg { width: 13px; height: 13px; }
`;

const BreadcrumbSep = styled.span`
    color: rgba(148, 163, 184, 0.25);
    font-size: 12px;
`;

const BreadcrumbCurrent = styled.span`
    font-size: 12px;
    color: rgba(148, 163, 184, 0.4);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 11px;
    flex-wrap: wrap;
`;

const LicensePlateBadge = styled.div`
    display: inline-flex;
    align-items: center;
    padding: 3px 12px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: ${st.radiusSm};
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 700;
    color: rgba(241, 245, 249, 0.95);
    letter-spacing: 2px;
    font-family: 'SF Mono', 'Fira Code', monospace;
`;

const VehicleTitle = styled.h1`
    margin: 0;
    font-size: 19px;
    font-weight: 800;
    color: #f1f5f9;
    letter-spacing: -0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 380px;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        font-size: 16px;
        max-width: 200px;
    }
`;

const StatusBadge = styled.span<{ $status: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 9px;
    border-radius: ${st.radiusFull};
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    flex-shrink: 0;

    ${({ $status }) => {
        if ($status === 'active') return 'background: rgba(16,185,129,0.18); color: #34d399; border: 1px solid rgba(16,185,129,0.28);';
        if ($status === 'sold')   return 'background: rgba(245,158,11,0.18); color: #fbbf24; border: 1px solid rgba(245,158,11,0.28);';
        return 'background: rgba(148,163,184,0.18); color: #94a3b8; border: 1px solid rgba(148,163,184,0.28);';
    }}
`;

const StatusDot = styled.div<{ $status: string }>`
    width: 5px;
    height: 5px;
    border-radius: 50%;

    ${({ $status }) => {
        if ($status === 'active') return 'background: #34d399;';
        if ($status === 'sold')   return 'background: #fbbf24;';
        return 'background: #94a3b8;';
    }}
`;

const MetaRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const MetaItem = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: rgba(148, 163, 184, 0.7);
`;

const MetaDot = styled.span`
    color: rgba(148, 163, 184, 0.2);
    font-size: 11px;
    user-select: none;
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 2px;

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        width: 100%;
        justify-content: flex-end;
    }
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    border: 1px solid transparent;

    ${({ $primary }) => $primary ? `
        background: ${st.accentBlue};
        color: white;
        border-color: ${st.accentBlue};
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        &:hover { background: #2563EB; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); transform: translateY(-1px); }
    ` : `
        background: rgba(255, 255, 255, 0.05);
        color: rgba(241, 245, 249, 0.6);
        border-color: rgba(255, 255, 255, 0.09);
        &:hover { background: rgba(255, 255, 255, 0.1); color: rgba(241, 245, 249, 0.9); border-color: rgba(255, 255, 255, 0.16); }
    `}

    svg { width: 14px; height: 14px; }
`;

// ─── Stats strip ──────────────────────────────────────────────────────────────

const StatsStrip = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    padding: 0 28px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 0 32px;
    }

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        padding: 0 20px;
        overflow-x: auto;
        scrollbar-width: none;
        &::-webkit-scrollbar { display: none; }
    }
`;

const StatItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 8px 20px 9px 0;
    margin-right: 20px;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;

    &:last-child { border-right: none; margin-right: 0; }
`;

const StatLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: rgba(148, 163, 184, 0.45);
`;

const StatValue = styled.span<{ $accent?: boolean }>`
    font-size: 13px;
    font-weight: 700;
    color: ${({ $accent }) => $accent ? st.accentBlue : 'rgba(241, 245, 249, 0.85)'};
    letter-spacing: -0.01em;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface VehicleHeaderProps {
    vehicle: Vehicle;
    onEditVehicle: () => void;
    onEditOwners: () => void;
}

export const VehicleHeader = ({ vehicle, onEditVehicle, onEditOwners }: VehicleHeaderProps) => {
    const navigate = useNavigate();

    const vehicleName = [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Pojazd';
    const yearSuffix  = vehicle.yearOfProduction ? ` (${vehicle.yearOfProduction})` : '';

    const metaParts = [
        vehicle.color,
        vehicle.currentMileage ? `${vehicle.currentMileage.toLocaleString()} km` : null,
        vehicle.paintType ? (paintLabels[vehicle.paintType.toLowerCase()] ?? vehicle.paintType) : null,
    ].filter(Boolean) as string[];

    const { stats } = vehicle;
    const totalSpent  = stats?.totalSpent  ?? { grossAmount: 0, currency: 'PLN' };
    const totalVisits = stats?.totalVisits ?? 0;
    const lastVisit   = stats?.lastVisitDate ?? null;

    return (
        <HeroHeader>
            <HeaderContent>
                <HeaderLeft>
                    <BreadcrumbRow>
                        <BackBtn onClick={() => navigate('/vehicles')} aria-label="Wróć do listy pojazdów">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Pojazdy
                        </BackBtn>
                        <BreadcrumbSep>/</BreadcrumbSep>
                        <BreadcrumbCurrent>{vehicle.licensePlate || vehicleName}</BreadcrumbCurrent>
                    </BreadcrumbRow>

                    <TitleRow>
                        <LicensePlateBadge>{vehicle.licensePlate || '—'}</LicensePlateBadge>
                        <VehicleTitle>{vehicleName}{yearSuffix}</VehicleTitle>
                        <StatusBadge $status={vehicle.status}>
                            <StatusDot $status={vehicle.status} />
                            {t.vehicles.detail.status[vehicle.status]}
                        </StatusBadge>
                    </TitleRow>

                    {metaParts.length > 0 && (
                        <MetaRow>
                            {metaParts.map((part, i) => (
                                <span key={part} style={{ display: 'contents' }}>
                                    {i > 0 && <MetaDot>·</MetaDot>}
                                    <MetaItem>{part}</MetaItem>
                                </span>
                            ))}
                        </MetaRow>
                    )}
                </HeaderLeft>

                <HeaderRight>
                    <ActionButton onClick={onEditOwners}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Właściciele
                    </ActionButton>
                    <ActionButton $primary onClick={onEditVehicle}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {t.common.edit}
                    </ActionButton>
                </HeaderRight>
            </HeaderContent>

            <StatsStrip>
                <StatItem>
                    <StatLabel>Przychód</StatLabel>
                    <StatValue $accent>
                        {formatCurrency(totalSpent.grossAmount, totalSpent.currency)}
                    </StatValue>
                </StatItem>
                <StatItem>
                    <StatLabel>Wizyty</StatLabel>
                    <StatValue>{totalVisits}</StatValue>
                </StatItem>
                {lastVisit && (
                    <StatItem>
                        <StatLabel>Ostatnia wizyta</StatLabel>
                        <StatValue>
                            {new Date(lastVisit).toLocaleDateString('pl-PL', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                            })}
                        </StatValue>
                    </StatItem>
                )}
                <StatItem>
                    <StatLabel>Przebieg</StatLabel>
                    <StatValue>
                        {vehicle.currentMileage}
                    </StatValue>
                </StatItem>
                <StatItem>
                    <StatLabel>W systemie od</StatLabel>
                    <StatValue>
                        {new Date(vehicle.createdAt).toLocaleDateString('pl-PL', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                    </StatValue>
                </StatItem>
            </StatsStrip>
        </HeroHeader>
    );
};
