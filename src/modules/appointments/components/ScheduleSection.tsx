// src/modules/appointments/components/ScheduleSection.tsx
import styled from 'styled-components';
import { t } from '@/common/i18n';

const Card = styled.div`
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    box-shadow: ${props => props.theme.shadows.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

const SectionHeaderWithToggle = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 2px solid ${props => props.theme.colors.border};
    margin-bottom: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
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

const CompactToggle = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
`;

const CompactToggleSwitch = styled.label`
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    cursor: pointer;
`;

const CompactToggleInput = styled.input`
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + span {
        background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    }

    &:checked + span:before {
        transform: translateX(20px);
    }

    &:focus + span {
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
    }
`;

const CompactToggleSlider = styled.span`
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.colors.border};
    transition: all ${props => props.theme.transitions.normal};
    border-radius: ${props => props.theme.radii.full};
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);

    &:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        transition: all ${props => props.theme.transitions.normal};
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
`;

const CompactToggleLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textSecondary};
    user-select: none;
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

interface ScheduleSectionProps {
    isAllDay: boolean;
    onIsAllDayChange: (value: boolean) => void;
    startDateTime: string;
    onStartDateTimeChange: (value: string) => void;
    endDateTime: string;
    onEndDateTimeChange: (value: string) => void;
}

export const ScheduleSection = ({
                                    isAllDay,
                                    onIsAllDayChange,
                                    startDateTime,
                                    onStartDateTimeChange,
                                    endDateTime,
                                    onEndDateTimeChange,
                                }: ScheduleSectionProps) => {
    const handleAllDayToggle = (checked: boolean) => {
        onIsAllDayChange(checked);
        if (checked && startDateTime) {
            const date = startDateTime.split('T')[0];
            onStartDateTimeChange(date);
            if (endDateTime) {
                onEndDateTimeChange(`${endDateTime.split('T')[0]}T23:59:59`);
            }
        }
    };

    return (
        <Card>
            <SectionHeaderWithToggle>
                <SectionTitle>{t.appointments.createView.scheduleSection}</SectionTitle>
                <CompactToggle>
                    <CompactToggleSwitch>
                        <CompactToggleInput
                            type="checkbox"
                            checked={isAllDay}
                            onChange={(e) => handleAllDayToggle(e.target.checked)}
                        />
                        <CompactToggleSlider />
                    </CompactToggleSwitch>
                    <CompactToggleLabel>{t.appointments.createView.allDayToggle}</CompactToggleLabel>
                </CompactToggle>
            </SectionHeaderWithToggle>

            <GridLayout>
                <FieldGroup>
                    <Label>{t.appointments.createView.startDateTime}</Label>
                    <Input
                        type={isAllDay ? 'date' : 'datetime-local'}
                        value={startDateTime}
                        onChange={(e) => onStartDateTimeChange(e.target.value)}
                    />
                </FieldGroup>

                <FieldGroup>
                    <Label>{t.appointments.createView.endDate}</Label>
                    <Input
                        type="date"
                        value={endDateTime.split('T')[0] || ''}
                        onChange={(e) => {
                            onEndDateTimeChange(isAllDay ? `${e.target.value}T23:59:59` : `${e.target.value}T23:59:59`);
                        }}
                    />
                </FieldGroup>
            </GridLayout>
        </Card>
    );
};