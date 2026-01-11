// src/modules/appointments/components/VehicleSection.tsx
import styled from 'styled-components';
import { t } from '@/common/i18n';
import type { SelectedVehicle } from '../types';

const Card = styled.div`
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    box-shadow: ${props => props.theme.shadows.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 2px solid ${props => props.theme.colors.border};
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h2`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xl};
    }
`;

const SelectButton = styled.button`
    width: 100%;
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.normal};
    box-shadow: ${props => props.theme.shadows.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.lg};
    }

    &:hover {
        transform: translateY(-2px);
        box-shadow: ${props => props.theme.shadows.lg};
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

const SelectedBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    background-color: ${props => props.theme.colors.successLight};
    color: ${props => props.theme.colors.success};
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const ChangeButton = styled.button`
    width: 100%;
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
        border-color: ${props => props.theme.colors.primary};
        color: ${props => props.theme.colors.primary};
        transform: translateY(-1px);
        box-shadow: ${props => props.theme.shadows.sm};
    }

    &:active {
        transform: translateY(0);
    }
`;

interface VehicleSectionProps {
    selectedVehicle: SelectedVehicle | null;
    onOpenModal: () => void;
}

export const VehicleSection = ({ selectedVehicle, onOpenModal }: VehicleSectionProps) => {
    return (
        <Card>
            <SectionHeader>
                <SectionTitle>{t.appointments.createView.vehicleSection}</SectionTitle>
            </SectionHeader>

            {!selectedVehicle ? (
                <SelectButton onClick={onOpenModal}>
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
                            <SelectedBadge>
                                {selectedVehicle.isNew
                                    ? t.appointments.selectedVehicle.newBadge
                                    : t.appointments.selectedVehicle.existingBadge}
                            </SelectedBadge>
                        </SelectedTitle>
                    </SelectedHeader>
                    <ChangeButton onClick={onOpenModal}>
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