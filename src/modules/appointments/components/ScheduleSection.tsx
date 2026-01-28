import styled from 'styled-components';
import { Card } from '@/common/components/Card';
import { FormGrid, FieldGroup, Label, Input } from '@/common/components/Form';
import { Toggle } from '@/common/components/Toggle';
import { t } from '@/common/i18n';

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
        const nowIso = new Date().toISOString();
        if (checked) {
            const date = (startDateTime || nowIso).split('T')[0];
            // In all-day mode we store start as date-only and end as end-of-day for the same date
            onStartDateTimeChange(date);
            onEndDateTimeChange(`${date}T23:59:59`);
        } else {
            // When switching off all-day, ensure start has time component suitable for datetime-local input
            const date = (startDateTime || nowIso).split('T')[0];
            const startWithTime = `${date}T09:00`;
            const endWithTime = `${date}T10:00`;
            onStartDateTimeChange(startDateTime.includes('T') ? startDateTime : startWithTime);
            onEndDateTimeChange(endDateTime ? (endDateTime.includes('T') ? endDateTime : endWithTime) : endWithTime);
        }
    };

    return (
        <Card>
            <SectionHeaderWithToggle>
                <SectionTitle>{t.appointments.createView.scheduleSection}</SectionTitle>
                <Toggle
                    checked={isAllDay}
                    onChange={handleAllDayToggle}
                    label={t.appointments.createView.allDayToggle}
                    size="sm"
                />
            </SectionHeaderWithToggle>

            <FormGrid>
                <FieldGroup>
                    <Label>{isAllDay ? t.appointments.createView.date : t.appointments.createView.startDateTime}</Label>
                    <Input
                        type={isAllDay ? 'date' : 'datetime-local'}
                        value={startDateTime}
                        onChange={(e) => onStartDateTimeChange(e.target.value)}
                    />
                </FieldGroup>

                {!isAllDay && (
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
                )}
            </FormGrid>
        </Card>
    );
};