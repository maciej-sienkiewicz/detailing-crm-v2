 import styled from 'styled-components';
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
    justify-content: space-between;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.md};
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 2px solid ${props => props.theme.colors.border};
`;

const CardHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
`;

const CardIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.lg};
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
    box-shadow: ${props => props.theme.shadows.md};
    color: white;
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

const ValueBox = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
    box-shadow: none;
    border: none;
    outline: none;
    user-select: none;
    font-weight: 700;
    color: #334155; /* match StatusPill 'no' text color for consistency */
    letter-spacing: 0.02em; /* match StatusPill */
    font-size: ${props => props.theme.fontSizes.xs}; /* match StatusPill */
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
    cursor: default;
`;

const UnitPill = styled.span`
    padding: 0;
    background: transparent;
    border: 0;
    color: inherit; /* match StatusPill text color */
    font-size: ${props => props.theme.fontSizes.xs}; /* match StatusPill */
    font-weight: 700; /* match StatusPill */
    letter-spacing: 0.02em; /* match StatusPill */
`;

const PlaceholderText = styled.span`
    color: ${props => props.theme.colors.textMuted};
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
    gap: 6px;
    padding: 6px 10px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: default;

    ${props => props.$state === 'yes' && `
        background: #dcfce7;
        color: #166534;
    `}

    ${props => props.$state === 'no' && `
        background: #f1f5f9;
        color: #334155;
    `}
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

const VehicleOverview = styled.div<{ $columnCount: number }>`
    display: grid;
    grid-template-columns: repeat(${props => props.$columnCount}, 1fr);
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.md};
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
    width: 36px;
    height: 36px;
    padding: 0;
    background: transparent;
    color: ${props => props.theme.colors.textMuted};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background: ${props => props.theme.colors.surfaceAlt};
        color: var(--brand-primary);
    }

    &:active {
        transform: scale(0.95);
    }
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

    // Calculate column count: license plate (optional) + brand + model + year (optional)
    let columnCount = 2; // brand + model always present
    if (vehicle.licensePlate) columnCount++;
    if (vehicle.yearOfProduction) columnCount++;

    return (
        <Card>
            <CardHeader>
                <CardHeaderLeft>
                    <CardIcon aria-label="Informacje o pojeździe" title="Informacje o pojeździe">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                            <path d="M12 2l6 2v6c0 5-3.5 9.5-6 10-2.5-.5-6-5-6-10V4l6-2z" fill="currentColor" opacity="0.9"/>
                            <path d="M9.5 10.5l2-2 1 1 2.5-2.5 1 1L12.5 12l-1-1-2 2-1-1 1-1z" fill="#ffffff" opacity="0.9"/>
                        </svg>
                    </CardIcon>
                    <CardTitle>Informacje o pojeździe</CardTitle>
                </CardHeaderLeft>
                {onViewDetails && (
                    <ViewDetailsIconButton onClick={onViewDetails} title="Pokaż pełne informacje o pojeździe" aria-label="Pokaż pełne informacje o pojeździe">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" fill="currentColor"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                    </ViewDetailsIconButton>
                )}
            </CardHeader>

            <VehicleOverview $columnCount={columnCount}>
                {vehicle.licensePlate && (
                    <VehicleField>
                        <InfoLabel>Numer rejestracyjny</InfoLabel>
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
                    <div style={{
                        padding: '12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <InfoLabel style={{ marginBottom: '8px' }}>Pojazd przekazała inna osoba</InfoLabel>
                        <InfoGrid>
                            <InfoItem>
                                <InfoLabel style={{ fontSize: '11px' }}>Imię i nazwisko</InfoLabel>
                                <InfoValue style={{ fontSize: '13px' }}>
                                    {vehicleHandoff.contactPerson.firstName} {vehicleHandoff.contactPerson.lastName}
                                </InfoValue>
                            </InfoItem>
                            {vehicleHandoff.contactPerson.phone && (
                                <InfoItem>
                                    <InfoLabel style={{ fontSize: '11px' }}>Telefon</InfoLabel>
                                    <InfoValue style={{ fontSize: '13px' }}>
                                        {vehicleHandoff.contactPerson.phone}
                                    </InfoValue>
                                </InfoItem>
                            )}
                            {vehicleHandoff.contactPerson.email && (
                                <InfoItem>
                                    <InfoLabel style={{ fontSize: '11px' }}>E-mail</InfoLabel>
                                    <InfoValue style={{ fontSize: '13px' }}>
                                        {vehicleHandoff.contactPerson.email}
                                    </InfoValue>
                                </InfoItem>
                            )}
                        </InfoGrid>
                    </div>
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
                        {keysHandedOver ? 'Tak' : 'Nie'}
                    </StatusPill>
                </ToggleRow>
                <ToggleRow>
                    <InfoLabel>Dokumenty przekazane</InfoLabel>
                    <StatusPill $state={documentsHandedOver ? 'yes' : 'no'}>
                        {documentsHandedOver ? 'Tak' : 'Nie'}
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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                            <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.9"/>
                            <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" fill="currentColor" opacity="0.9"/>
                            <path d="M4 20c0-2.209 3.582-4 8-4s8 1.791 8 4" fill="#ffffff" opacity="0.9"/>
                        </svg>
                    </CardIcon>
                    <CardTitle>Informacje o kliencie</CardTitle>
                </CardHeaderLeft>
                {onViewDetails && (
                    <ViewDetailsIconButton onClick={onViewDetails} title="Pokaż pełne informacje o kliencie" aria-label="Pokaż pełne informacje o kliencie">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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