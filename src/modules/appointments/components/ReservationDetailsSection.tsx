// src/modules/appointments/components/ReservationDetailsSection.tsx
import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { FormGrid, FieldGroup, Label, Input } from '@/common/components/Form';
import { t } from '@/common/i18n';
import type { AppointmentColor } from '../types';

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
            <CardHeader>
                <CardTitle>{t.appointments.createView.reservationDetails}</CardTitle>
            </CardHeader>

            <FormGrid>
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
            </FormGrid>
        </Card>
    );
};