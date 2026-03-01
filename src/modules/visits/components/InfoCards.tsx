 import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import type { VehicleInfo, CustomerInfo } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 24px;
    box-shadow: ${st.shadowSm};
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid ${st.border};
`;

const CardHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

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

const CardTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;

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
    font-size: ${st.fontXs};
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

const ToggleSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    background: ${st.bg};
    border-radius: ${st.radiusSm};
    border: 1px solid ${st.border};
`;

const ValueBox = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-weight: 700;
    color: ${st.text};
    font-size: ${st.fontXs};
    font-variant-numeric: tabular-nums;
    cursor: default;
`;

const UnitPill = styled.span`
    color: ${st.textMuted};
    font-size: ${st.fontXs};
    font-weight: 600;
`;

const PlaceholderText = styled.span`
    color: ${st.textMuted};
    font-weight: 500;
`;

const ToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const StatusPill = styled.span<{ $state: 'yes' | 'no' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: default;

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

const StatBadge = styled.div<{ $variant: 'success' | 'info' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
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

const VehicleOverview = styled.div<{ $columnCount: number }>`
    display: grid;
    grid-template-columns: repeat(${props => props.$columnCount}, 1fr);
    gap: 16px;
    margin-bottom: 16px;
`;

const VehicleField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
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

const ViewDetailsIconButton = styled.button`
    width: 34px;
    height: 34px;
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

    &:hover {
        background: ${st.bg};
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
    }
`;

const HandoffBox = styled.div`
    padding: 12px;
    background: ${st.bgCard};
    border-radius: ${st.radiusSm};
    border: 1px solid ${st.border};
`;

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
    const mileageNumber = hasMileage ? mileageAtArrival!.toLocaleString('pl-PL') : undefined;
    const mileageAria = hasMileage
        ? `Przebieg przy przyjęciu: ${mileageNumber} kilometrów`
        : 'Przebieg przy przyjęciu: brak danych';

    let columnCount = 2;
    if (vehicle.licensePlate) columnCount++;
    if (vehicle.yearOfProduction) columnCount++;

    return (
        <Card>
            <CardHeader>
                <CardHeaderLeft>
                    <CardIcon aria-label="Informacje o pojeździe" title="Informacje o pojeździe">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                            <path d="M12 2l6 2v6c0 5-3.5 9.5-6 10-2.5-.5-6-5-6-10V4l6-2z" fill="currentColor" opacity="0.9"/>
                            <path d="M9.5 10.5l2-2 1 1 2.5-2.5 1 1L12.5 12l-1-1-2 2-1-1 1-1z" fill="#ffffff" opacity="0.9"/>
                        </svg>
                    </CardIcon>
                    <CardTitle>Informacje o pojeździe</CardTitle>
                </CardHeaderLeft>
                {onViewDetails && (
                    <ViewDetailsIconButton onClick={onViewDetails} title="Pokaż pełne informacje o pojeździe" aria-label="Pokaż pełne informacje o pojeździe">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" fill="currentColor"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                    </ViewDetailsIconButton>
                )}
            </CardHeader>

            <VehicleOverview $columnCount={columnCount}>
                {vehicle.licensePlate && (
                    <VehicleField>
                        <InfoLabel>Tablice</InfoLabel>
                        <LicensePlate>{vehicle.licensePlate}</LicensePlate>
                    </VehicleField>
                )}
                <VehicleField>
                    <InfoLabel>Marka</InfoLabel>
                    <InfoValue>{vehicle.brand}</InfoValue>
                </VehicleField>
                <VehicleField>
                    <InfoLabel>Model</InfoLabel>
                    <InfoValue>{vehicle.model}</InfoValue>
                </VehicleField>
                {vehicle.yearOfProduction && (
                    <VehicleField>
                        <InfoLabel>Rok produkcji</InfoLabel>
                        <InfoValue>{vehicle.yearOfProduction}</InfoValue>
                    </VehicleField>
                )}
            </VehicleOverview>

            <ToggleSection>
                {vehicleHandoff?.isHandedOffByOtherPerson && (
                    <HandoffBox>
                        <InfoLabel style={{ marginBottom: '10px', display: 'block' }}>Pojazd przekazała inna osoba</InfoLabel>
                        <InfoGrid>
                            <InfoItem>
                                <InfoLabel>Imię i nazwisko</InfoLabel>
                                <InfoValue>
                                    {vehicleHandoff.contactPerson.firstName} {vehicleHandoff.contactPerson.lastName}
                                </InfoValue>
                            </InfoItem>
                            {vehicleHandoff.contactPerson.phone && (
                                <InfoItem>
                                    <InfoLabel>Telefon</InfoLabel>
                                    <InfoValue>{vehicleHandoff.contactPerson.phone}</InfoValue>
                                </InfoItem>
                            )}
                            {vehicleHandoff.contactPerson.email && (
                                <InfoItem>
                                    <InfoLabel>E-mail</InfoLabel>
                                    <InfoValue>{vehicleHandoff.contactPerson.email}</InfoValue>
                                </InfoItem>
                            )}
                        </InfoGrid>
                    </HandoffBox>
                )}

                <ToggleRow>
                    <InfoLabel>Przebieg przy przyjęciu</InfoLabel>
                    <ValueBox role="text" aria-label={mileageAria} title={hasMileage ? `${mileageNumber} km` : undefined}>
                        {hasMileage ? (
                            <>
                                <span>{mileageNumber}</span>
                                <UnitPill>km</UnitPill>
                            </>
                        ) : (
                            <PlaceholderText>—</PlaceholderText>
                        )}
                    </ValueBox>
                </ToggleRow>
                <ToggleRow>
                    <InfoLabel>Kluczyki przekazane</InfoLabel>
                    <StatusPill $state={keysHandedOver ? 'yes' : 'no'}>
                        {keysHandedOver ? '✓ Tak' : '— Nie'}
                    </StatusPill>
                </ToggleRow>
                <ToggleRow>
                    <InfoLabel>Dokumenty przekazane</InfoLabel>
                    <StatusPill $state={documentsHandedOver ? 'yes' : 'no'}>
                        {documentsHandedOver ? '✓ Tak' : '— Nie'}
                    </StatusPill>
                </ToggleRow>
            </ToggleSection>
        </Card>
    );
};

interface CustomerInfoCardProps {
    customer: CustomerInfo;
    onViewDetails?: () => void;
}

export const CustomerInfoCard = ({ customer, onViewDetails }: CustomerInfoCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardHeaderLeft>
                    <CardIcon aria-label="Informacje o kliencie" title="Informacje o kliencie">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                            <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.9"/>
                            <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" fill="currentColor" opacity="0.9"/>
                            <path d="M4 20c0-2.209 3.582-4 8-4s8 1.791 8 4" fill="#ffffff" opacity="0.9"/>
                        </svg>
                    </CardIcon>
                    <CardTitle>Informacje o kliencie</CardTitle>
                </CardHeaderLeft>
                {onViewDetails && (
                    <ViewDetailsIconButton onClick={onViewDetails} title="Pokaż pełne informacje o kliencie" aria-label="Pokaż pełne informacje o kliencie">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" fill="currentColor"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                    </ViewDetailsIconButton>
                )}
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

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <StatBadge $variant="success">
                    LTV: {formatCurrency(
                        customer.stats.totalSpent.grossAmount / 100,
                        customer.stats.totalSpent.currency
                    )}
                </StatBadge>
                <StatBadge $variant="info">
                    {customer.stats.totalVisits} wizyt
                </StatBadge>
                <StatBadge $variant="info">
                    {customer.stats.vehiclesCount} pojazdów
                </StatBadge>
            </div>
        </Card>
    );
};
