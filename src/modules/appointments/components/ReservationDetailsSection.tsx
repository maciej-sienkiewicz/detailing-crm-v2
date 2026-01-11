// src/modules/appointments/components/ReservationDetailsSection.tsx
import styled from 'styled-components';
import { t } from '@/common/i18n';
import type { AppointmentColor } from '../types';

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

const GridLayout = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.lg};
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 1fr 1fr;
    }
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const Label = styled.label`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const Input = styled.input`
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const ColorSelectWrapper = styled.div`
    position: relative;
`;

const ColorDot = styled.div<{ $color: string }>`
    position: absolute;
    left: ${props => props.theme.spacing.md};
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: ${props => props.$color};
    border: 2px solid ${props => props.theme.colors.border};
    box-shadow: ${props => props.theme.shadows.sm};
    pointer-events: none;
    z-index: 1;
`;

const ColorSelect = styled.select`
    width: 100%;
    padding: ${props => props.theme.spacing.md};
    padding-left: 48px;
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    background-color: ${props => props.theme.colors.surface};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    font-weight: ${props => props.theme.fontWeights.medium};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

interface ReservationDetailsSectionProps {
    appointmentTitle: string;
    onAppointmentTitleChange: (value: string) => void;
    selectedColorId: string;
    onColorChange: (value: string) => void;
    colors: AppointmentColor[];
}

export const ReservationDetailsSection = ({
                                              appointmentTitle,
                                              onAppointmentTitleChange,
                                              selectedColorId,
                                              onColorChange,
                                              colors,
                                          }: ReservationDetailsSectionProps) => {
    return (
        <Card>
            <SectionHeader>
                <SectionTitle>{t.appointments.createView.reservationDetails}</SectionTitle>
            </SectionHeader>

            <GridLayout>
                <FieldGroup>
                    <Label>{t.appointments.createView.appointmentNameLabel}</Label>
                    <Input
                        type="text"
                        placeholder={t.appointments.createView.appointmentNamePlaceholder}
                        value={appointmentTitle}
                        onChange={(e) => onAppointmentTitleChange(e.target.value)}
                    />
                </FieldGroup>

                <FieldGroup>
                    <Label>{t.appointments.createView.colorLabel}</Label>
                    <ColorSelectWrapper>
                        <ColorDot
                            $color={colors.find(c => c.id === selectedColorId)?.hexColor || '#cccccc'}
                        />
                        <ColorSelect
                            value={selectedColorId}
                            onChange={(e) => onColorChange(e.target.value)}
                        >
                            {colors.map((color) => (
                                <option key={color.id} value={color.id}>
                                    {color.name}
                                </option>
                            ))}
                        </ColorSelect>
                    </ColorSelectWrapper>
                </FieldGroup>
            </GridLayout>
        </Card>
    );
};