import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import type { VehicleInfo, CustomerInfo } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Shared ───────────────────────────────────────────────────────────────────

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 20px 24px 24px;
    box-shadow: ${st.shadowSm};
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid ${st.border};
`;

const CardHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const CardSubtitle = styled.span`
    display: block;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-weight: 400;
    margin-top: 2px;
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px 24px;
`;

const InfoItem = styled.div<{ $full?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 5px;
    ${props => props.$full && 'grid-column: 1 / -1;'}
`;

const InfoLabel = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    font-weight: 700;
`;

const InfoValue = styled.span`
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

const SectionDivider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 18px 0;
`;

const ViewDetailsIconButton = styled.button`
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    color: ${st.textMuted};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    cursor: pointer;
    transition: all ${st.transition};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &:hover {
        background: ${st.bg};
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
    }
`;

// ─── Customer-specific ────────────────────────────────────────────────────────

const CustomerAvatar = styled.div`
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: ${st.gradientBlue};
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    flex-shrink: 0;
    letter-spacing: 0.5px;
    user-select: none;
`;

const StatBadge = styled.div<{ $variant: 'success' | 'info' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;

    ${props => props.$variant === 'success' && `
        background: ${st.accentGreenDim};
        color: ${st.accentGreen};
    `}

    ${props => props.$variant === 'info' && `
        background: ${st.accentBlueDim};
        color: ${st.accentBlue};
    `}
`;

const StatsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

// ─── Vehicle-specific ─────────────────────────────────────────────────────────

const CardIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${st.gradientBlue};
    color: white;
    flex-shrink: 0;
`;

const LicensePlate = styled.div`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 10px 4px 20px;
    background: linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%);
    border: 2px solid #000000;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #000000;
    box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        inset 0 -1px 0 rgba(0, 0, 0, 0.1);
    position: relative;
    text-transform: uppercase;
    width: fit-content;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 16px;
        background: linear-gradient(180deg, #003399 0%, #002266 100%);
        border-right: 1px solid #000000;
        border-radius: 2px 0 0 2px;
    }

    &::after {
        content: 'PL';
        position: absolute;
        left: 3px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 8px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.3px;
    }
`;

const HandoffGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    padding: 14px 16px;
    background: ${st.bg};
    border-radius: ${st.radiusSm};
    border: 1px solid ${st.border};
`;

const HandoffItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StatusPill = styled.span<{ $state: 'yes' | 'no' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: default;
    width: fit-content;

    ${props => props.$state === 'yes' && `
        background: ${st.accentGreenDim};
        color: ${st.accentGreen};
    `}

    ${props => props.$state === 'no' && `
        background: ${st.bg};
        color: ${st.textSecondary};
        border: 1px solid ${st.border};
    `}
`;

const HandoffPersonBox = styled.div`
    margin-top: 14px;
    padding: 14px 16px;
    background: ${st.bg};
    border-radius: ${st.radiusSm};
    border: 1px solid ${st.border};
`;

const HandoffPersonLabel = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    font-weight: 700;
    margin-bottom: 12px;
`;

// ─── CustomerInfoCard ─────────────────────────────────────────────────────────

interface CustomerInfoCardProps {
    customer: CustomerInfo;
    onViewDetails?: () => void;
}

export const CustomerInfoCard = ({ customer, onViewDetails }: CustomerInfoCardProps) => {
    const initials = [customer.firstName?.[0], customer.lastName?.[0]]
        .filter(Boolean)
        .join('')
        .toUpperCase();

    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || null;

    return (
        <Card>
            <CardHeader>
                <CardHeaderLeft>
                    <CustomerAvatar aria-hidden="true">{initials}</CustomerAvatar>
                    <div>
                        <CardTitle>{fullName ?? <MissingValue>Nie wprowadzono danych</MissingValue>}</CardTitle>
                        {customer.companyName && (
                            <CardSubtitle>{customer.companyName}</CardSubtitle>
                        )}
                    </div>
                </CardHeaderLeft>
                {onViewDetails && (
                    <ViewDetailsIconButton
                        onClick={onViewDetails}
                        title="Pokaż pełne informacje o kliencie"
                        aria-label="Pokaż pełne informacje o kliencie"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" fill="currentColor"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                    </ViewDetailsIconButton>
                )}
            </CardHeader>

            <InfoGrid>
                <InfoItem>
                    <InfoLabel>Email</InfoLabel>
                    {customer.email
                        ? <InfoValue>{customer.email}</InfoValue>
                        : <MissingValue>Nie wprowadzono danych</MissingValue>
                    }
                </InfoItem>
                <InfoItem>
                    <InfoLabel>Telefon</InfoLabel>
                    {customer.phone
                        ? <InfoValue>{customer.phone}</InfoValue>
                        : <MissingValue>Nie wprowadzono danych</MissingValue>
                    }
                </InfoItem>
                {customer.companyName && (
                    <InfoItem $full>
                        <InfoLabel>Firma</InfoLabel>
                        <InfoValue>{customer.companyName}</InfoValue>
                    </InfoItem>
                )}
            </InfoGrid>

            <SectionDivider />

            <StatsRow>
                <StatBadge $variant="success">
                    LTV: {formatCurrency(
                        customer.stats.totalSpent.grossAmount / 100,
                        customer.stats.totalSpent.currency
                    )}
                </StatBadge>
                <StatBadge $variant="info">
                    {customer.stats.totalVisits} {customer.stats.totalVisits === 1 ? 'wizyta' : 'wizyt'}
                </StatBadge>
                <StatBadge $variant="info">
                    {customer.stats.vehiclesCount} {customer.stats.vehiclesCount === 1 ? 'pojazd' : 'pojazdów'}
                </StatBadge>
            </StatsRow>
        </Card>
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
    const mileageFormatted = hasMileage ? mileageAtArrival!.toLocaleString('pl-PL') : null;

    return (
        <Card>
            <CardHeader>
                <CardHeaderLeft>
                    <CardIcon aria-label="Informacje o pojeździe" title="Informacje o pojeździe">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                            <path d="M5 11l1.5-4.5h11L19 11" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                            <rect x="3" y="11" width="18" height="7" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
                            <circle cx="7.5" cy="18.5" r="1.5" fill="currentColor"/>
                            <circle cx="16.5" cy="18.5" r="1.5" fill="currentColor"/>
                            <path d="M3 14h18" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                        </svg>
                    </CardIcon>
                    <CardTitle>Informacje o pojeździe</CardTitle>
                </CardHeaderLeft>
                {onViewDetails && (
                    <ViewDetailsIconButton
                        onClick={onViewDetails}
                        title="Pokaż pełne informacje o pojeździe"
                        aria-label="Pokaż pełne informacje o pojeździe"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" fill="currentColor"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                    </ViewDetailsIconButton>
                )}
            </CardHeader>

            <InfoGrid>
                <InfoItem>
                    <InfoLabel>Tablice rejestracyjne</InfoLabel>
                    {vehicle.licensePlate
                        ? <LicensePlate>{vehicle.licensePlate}</LicensePlate>
                        : <MissingValue>Nie wprowadzono danych</MissingValue>
                    }
                </InfoItem>
                <InfoItem>
                    <InfoLabel>Rok produkcji</InfoLabel>
                    {vehicle.yearOfProduction
                        ? <InfoValue>{vehicle.yearOfProduction}</InfoValue>
                        : <MissingValue>Nie wprowadzono danych</MissingValue>
                    }
                </InfoItem>
                <InfoItem>
                    <InfoLabel>Marka</InfoLabel>
                    {vehicle.brand
                        ? <InfoValue>{vehicle.brand}</InfoValue>
                        : <MissingValue>Nie wprowadzono danych</MissingValue>
                    }
                </InfoItem>
                <InfoItem>
                    <InfoLabel>Model</InfoLabel>
                    {vehicle.model
                        ? <InfoValue>{vehicle.model}</InfoValue>
                        : <MissingValue>Nie wprowadzono danych</MissingValue>
                    }
                </InfoItem>
                {vehicle.color && (
                    <InfoItem>
                        <InfoLabel>Kolor</InfoLabel>
                        <InfoValue>{vehicle.color}</InfoValue>
                    </InfoItem>
                )}
            </InfoGrid>

            <HandoffGrid>
                <HandoffItem>
                    <InfoLabel>Przebieg przy przyjęciu</InfoLabel>
                    {mileageFormatted
                        ? <InfoValue>{mileageFormatted} km</InfoValue>
                        : <MissingValue>Nie wprowadzono danych</MissingValue>
                    }
                </HandoffItem>
                <HandoffItem>
                    <InfoLabel>Kluczyki</InfoLabel>
                    <StatusPill $state={keysHandedOver ? 'yes' : 'no'}>
                        {keysHandedOver ? '✓ Tak' : '— Nie'}
                    </StatusPill>
                </HandoffItem>
                <HandoffItem>
                    <InfoLabel>Dokumenty</InfoLabel>
                    <StatusPill $state={documentsHandedOver ? 'yes' : 'no'}>
                        {documentsHandedOver ? '✓ Tak' : '— Nie'}
                    </StatusPill>
                </HandoffItem>
            </HandoffGrid>

            {vehicleHandoff?.isHandedOffByOtherPerson && (
                <HandoffPersonBox>
                    <HandoffPersonLabel>Pojazd przekazała inna osoba</HandoffPersonLabel>
                    <InfoGrid>
                        <InfoItem>
                            <InfoLabel>Imię i nazwisko</InfoLabel>
                            <InfoValue>
                                {vehicleHandoff.contactPerson.firstName} {vehicleHandoff.contactPerson.lastName}
                            </InfoValue>
                        </InfoItem>
                        <InfoItem>
                            <InfoLabel>Telefon</InfoLabel>
                            {vehicleHandoff.contactPerson.phone
                                ? <InfoValue>{vehicleHandoff.contactPerson.phone}</InfoValue>
                                : <MissingValue>Nie wprowadzono danych</MissingValue>
                            }
                        </InfoItem>
                        <InfoItem $full>
                            <InfoLabel>E-mail</InfoLabel>
                            {vehicleHandoff.contactPerson.email
                                ? <InfoValue>{vehicleHandoff.contactPerson.email}</InfoValue>
                                : <MissingValue>Nie wprowadzono danych</MissingValue>
                            }
                        </InfoItem>
                    </InfoGrid>
                </HandoffPersonBox>
            )}
        </Card>
    );
};
