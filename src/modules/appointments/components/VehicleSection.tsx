// src/modules/appointments/components/VehicleSection.tsx
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { Button } from '@/common/components/Button';
import { Badge } from '@/common/components/Badge';
import { t } from '@/common/i18n';
import type { SelectedVehicle } from '../types';

const SelectButton = styled(Button)`
    width: 100%;
    font-size: ${props => props.theme.fontSizes.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.lg};
    }
`;

const SelectedInfo = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(14, 165, 233, 0.02) 100%);
    border-radius: ${props => props.theme.radii.lg};
    border: 2px solid ${props => props.theme.colors.primary};
    position: relative;
    overflow: hidden;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }

    &:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(180deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    }
`;

const SelectedHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const SelectedIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: ${props => props.theme.radii.lg};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: ${props => props.theme.shadows.md};
    flex-shrink: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        width: 48px;
        height: 48px;
    }

    svg {
        width: 20px;
        height: 20px;

        @media (min-width: ${props => props.theme.breakpoints.md}) {
            width: 24px;
            height: 24px;
        }
    }
`;

const SelectedTitle = styled.div`
    flex: 1;
`;

const SelectedName = styled.div`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xl};
    }
`;

const SelectedDetails = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.md};
    grid-template-columns: 1fr;
    margin-bottom: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const DetailItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const DetailLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const DetailValue = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    svg {
        width: 16px;
        height: 16px;
        color: ${props => props.theme.colors.primary};
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
    }
`;

const ActionButton = styled(Button)`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
`;

const ChangeButton = styled(Button)`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
`;

interface VehicleSectionProps {
    selectedVehicle: SelectedVehicle | null;
    onOpenModal: () => void;
}

export const VehicleSection = ({ selectedVehicle, onOpenModal }: VehicleSectionProps) => {
    const navigate = useNavigate();

    const handleShowDetails = () => {
        if (selectedVehicle?.id) {
            navigate(`/vehicles/${selectedVehicle.id}`);
        }
    };

    // Pojazd z serwera (vehicleId istnieje i nie jest nowy)
    const isVehicleFromServer = selectedVehicle && !selectedVehicle.isNew && selectedVehicle.id;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t.appointments.createView.vehicleSection}</CardTitle>
            </CardHeader>

            {!selectedVehicle ? (
                <SelectButton $variant="primary" onClick={onOpenModal}>
                    {t.appointments.createView.selectOrAddVehicle}
                </SelectButton>
            ) : (
                <SelectedInfo>
                    <SelectedHeader>
                        <SelectedIcon>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                        </SelectedIcon>
                        <SelectedTitle>
                            <SelectedName>
                                {selectedVehicle.brand} {selectedVehicle.model}
                            </SelectedName>
                            <Badge $variant={selectedVehicle.isNew ? 'primary' : 'success'}>
                                {selectedVehicle.isNew
                                    ? t.appointments.selectedVehicle.newBadge
                                    : t.appointments.selectedVehicle.existingBadge}
                            </Badge>
                        </SelectedTitle>
                    </SelectedHeader>

                    {/* Wyświetl szczegóły tylko gdy pojazd ma dodatkowe dane */}
                    {(selectedVehicle.year || selectedVehicle.licensePlate) && (
                        <SelectedDetails>
                            {selectedVehicle.year && (
                                <DetailItem>
                                    <DetailLabel>{t.appointments.selectedVehicle.yearLabel}</DetailLabel>
                                    <DetailValue>{selectedVehicle.year}</DetailValue>
                                </DetailItem>
                            )}
                            {selectedVehicle.licensePlate && (
                                <DetailItem>
                                    <DetailLabel>{t.appointments.selectedVehicle.licensePlateLabel}</DetailLabel>
                                    <DetailValue>{selectedVehicle.licensePlate}</DetailValue>
                                </DetailItem>
                            )}
                        </SelectedDetails>
                    )}

                    {/* Jeśli pojazd jest z serwera (vehicleId istnieje), pokaż dwa przyciski */}
                    {isVehicleFromServer ? (
                        <ButtonGroup>
                            <ActionButton $variant="secondary" onClick={handleShowDetails}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {t.appointments.selectedVehicle.showDetails}
                            </ActionButton>
                            <ActionButton $variant="secondary" onClick={onOpenModal}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {t.appointments.selectedVehicle.changeVehicleButton}
                            </ActionButton>
                        </ButtonGroup>
                    ) : (
                        <ChangeButton $variant="secondary" onClick={onOpenModal}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {t.appointments.selectedVehicle.changeVehicleButton}
                        </ChangeButton>
                    )}
                </SelectedInfo>
            )}
        </Card>
    );
};