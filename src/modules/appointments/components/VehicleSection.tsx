// src/modules/appointments/components/VehicleSection.tsx
import styled from 'styled-components';
import { Car, Motorbike } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { Button } from '@/common/components/Button';
import { Badge } from '@/common/components/Badge';
import { t } from '@/common/i18n';
import type { SelectedVehicle } from '../types';
import { normalizeVehicleKind } from '@/modules/vehicles/vehicleKind';

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
                            {/* Ikona mówi, CO stoi w rezerwacji - motocykl nie dostaje sylwetki auta. */}
                            {normalizeVehicleKind(selectedVehicle.kind) === 'MOTORCYCLE'
                                ? <Motorbike aria-hidden="true" />
                                : <Car aria-hidden="true" />}
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
                    <ChangeButton $variant="secondary" onClick={onOpenModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t.appointments.createView.changeVehicle}
                    </ChangeButton>
                </SelectedInfo>
            )}
        </Card>
    );
};