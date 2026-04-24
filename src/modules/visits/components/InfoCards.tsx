import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import type { VehicleInfo, CustomerInfo } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';
const BRAND_DIM = 'rgba(14, 165, 233, 0.10)';

// ─── Shared ───────────────────────────────────────────────────────────────────

const SidebarCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 16px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bgCard};
`;

const CardTitleGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CardIconWrap = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%);
    color: white;
    flex-shrink: 0;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 600;
    letter-spacing: -0.1px;
    color: ${st.text};
`;

const ViewBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: transparent;
    color: ${BRAND_DARK};
    border: 1px solid rgba(14, 165, 233, 0.3);
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover {
        background: ${BRAND_DIM};
        border-color: ${BRAND};
        color: ${BRAND};
    }

    svg { width: 11px; height: 11px; }
`;

const CardBody = styled.div`
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const Row = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const Label = styled.span`
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.08em;
`;

const Value = styled.span`
    font-size: ${st.fontSm};
    color: ${st.text};
    font-weight: 500;
`;

const MissingValue = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    font-style: italic;
    font-weight: 400;
`;

const Divider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 2px 0;
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: ${st.border};
    border: 1px solid ${st.border};
    border-radius: 10px;
    overflow: hidden;
`;

const StatCell = styled.div`
    background: ${st.bgCard};
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    transition: background ${st.transition};
    &:hover { background: ${st.bg}; }
`;

const StatValue = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.3px;
`;

const StatLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.08em;
`;

// ─── Vehicle-specific ─────────────────────────────────────────────────────────

const IntakeGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
`;

const IntakeItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StatusPill = styled.span<{ $ok: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 9px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 700;
    width: fit-content;

    ${props => props.$ok ? `
        background: ${st.accentGreenDim};
        color: ${st.accentGreen};
        border: 1px solid rgba(16, 185, 129, 0.2);
    ` : `
        background: ${st.bg};
        color: ${st.textMuted};
        border: 1px solid ${st.border};
    `}
`;

const HandoffBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 2px;
    border-top: 1px solid ${st.border};
`;

const HandoffLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    color: ${st.accentAmber};
    text-transform: uppercase;
    letter-spacing: 0.08em;
`;

// ─── CustomerInfoCard ─────────────────────────────────────────────────────────

interface CustomerInfoCardProps {
    customer: CustomerInfo;
    onViewDetails?: () => void;
}

export const CustomerInfoCard = ({ customer, onViewDetails }: CustomerInfoCardProps) => {
    const pluralVisits = (n: number) => n === 1 ? '1 wizyta' : `${n} wizyt`;
    const pluralVehicles = (n: number) => n === 1 ? '1 pojazd' : `${n} pojazdów`;

    return (
        <SidebarCard>
            <CardHeader>
                <CardTitleGroup>
                    <CardIconWrap aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" />
                        </svg>
                    </CardIconWrap>
                    <CardTitle>Klient</CardTitle>
                </CardTitleGroup>
                {onViewDetails && (
                    <ViewBtn onClick={onViewDetails} aria-label="Otwórz profil klienta">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Profil
                    </ViewBtn>
                )}
            </CardHeader>

            <CardBody>
                <Row>
                    <Label>Email</Label>
                    {customer.email
                        ? <Value>{customer.email}</Value>
                        : <MissingValue>Nie wprowadzono danych</MissingValue>
                    }
                </Row>

                <Row>
                    <Label>Telefon</Label>
                    {customer.phone
                        ? <Value>{customer.phone}</Value>
                        : <MissingValue>Nie wprowadzono danych</MissingValue>
                    }
                </Row>

                {customer.companyName && (
                    <Row>
                        <Label>Firma</Label>
                        <Value>{customer.companyName}</Value>
                    </Row>
                )}

                <Divider />

                <StatsGrid>
                    <StatCell>
                        <StatLabel>Przychód</StatLabel>
                        <StatValue>
                            {formatCurrency(
                                customer.stats.totalSpent.grossAmount / 100,
                                customer.stats.totalSpent.currency
                            )}
                        </StatValue>
                    </StatCell>
                    <StatCell>
                        <StatLabel>Wizyty</StatLabel>
                        <StatValue>{customer.stats.totalVisits}</StatValue>
                    </StatCell>
                    <StatCell>
                        <StatLabel>Pojazdy</StatLabel>
                        <StatValue>{customer.stats.vehiclesCount}</StatValue>
                    </StatCell>
                </StatsGrid>
            </CardBody>
        </SidebarCard>
    );
};

// ─── VehicleInfoCard ──────────────────────────────────────────────────────────

interface VehicleInfoCardProps {
    vehicle: VehicleInfo;
    mileageAtArrival?: number;
    keysHandedOver: boolean;
    documentsHandedOver: boolean;
    vehicleHandoff?: {
        isHandedOffByOtherPerson: boolean;
        contactPerson: {
            firstName: string;
            lastName: string;
            phone: string;
            email: string;
        };
    };
    onMileageChange: (mileage: number) => void;
    onKeysToggle: (checked: boolean) => void;
    onDocumentsToggle: (checked: boolean) => void;
    onViewDetails?: () => void;
}

export const VehicleInfoCard = ({
    vehicle,
    mileageAtArrival,
    keysHandedOver,
    documentsHandedOver,
    vehicleHandoff,
    onViewDetails,
}: VehicleInfoCardProps) => {
    const hasMileage = typeof mileageAtArrival === 'number' && mileageAtArrival > 0;
    const mileageStr = hasMileage ? `${mileageAtArrival!.toLocaleString('pl-PL')} km` : null;

    return (
        <SidebarCard>
            <CardHeader>
                <CardTitleGroup>
                    <CardIconWrap aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 11l1.5-4.5h11L19 11" strokeLinecap="round" />
                            <rect x="3" y="11" width="18" height="7" rx="2" fill="currentColor" fillOpacity="0.2" />
                            <circle cx="7.5" cy="18.5" r="1.5" fill="currentColor" />
                            <circle cx="16.5" cy="18.5" r="1.5" fill="currentColor" />
                        </svg>
                    </CardIconWrap>
                    <CardTitle>Stan przy przyjęciu</CardTitle>
                </CardTitleGroup>
                {onViewDetails && (
                    <ViewBtn onClick={onViewDetails} aria-label="Otwórz kartę pojazdu">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Karta
                    </ViewBtn>
                )}
            </CardHeader>

            <CardBody>
                <IntakeGrid>
                    <IntakeItem style={{ gridColumn: '1 / -1' }}>
                        <Label>Przebieg przy przyjęciu</Label>
                        {mileageStr
                            ? <Value>{mileageStr}</Value>
                            : <MissingValue>Nie wprowadzono danych</MissingValue>
                        }
                    </IntakeItem>
                    <IntakeItem>
                        <Label>Kluczyki</Label>
                        <StatusPill $ok={keysHandedOver}>
                            {keysHandedOver ? '✓ Tak' : '— Nie'}
                        </StatusPill>
                    </IntakeItem>
                    <IntakeItem>
                        <Label>Dokumenty</Label>
                        <StatusPill $ok={documentsHandedOver}>
                            {documentsHandedOver ? '✓ Tak' : '— Nie'}
                        </StatusPill>
                    </IntakeItem>
                </IntakeGrid>

                {vehicle.color && (
                    <Row>
                        <Label>Kolor</Label>
                        <Value>{vehicle.color}</Value>
                    </Row>
                )}

                {vehicleHandoff?.isHandedOffByOtherPerson && (
                    <HandoffBox>
                        <HandoffLabel>Przekazała inna osoba</HandoffLabel>
                        <Row>
                            <Label>Imię i nazwisko</Label>
                            <Value>
                                {vehicleHandoff.contactPerson.firstName} {vehicleHandoff.contactPerson.lastName}
                            </Value>
                        </Row>
                        {vehicleHandoff.contactPerson.phone && (
                            <Row>
                                <Label>Telefon</Label>
                                <Value>{vehicleHandoff.contactPerson.phone}</Value>
                            </Row>
                        )}
                        {vehicleHandoff.contactPerson.email && (
                            <Row>
                                <Label>E-mail</Label>
                                <Value>{vehicleHandoff.contactPerson.email}</Value>
                            </Row>
                        )}
                    </HandoffBox>
                )}
            </CardBody>
        </SidebarCard>
    );
};
