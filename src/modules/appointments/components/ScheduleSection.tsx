import styled from 'styled-components';
import { Card } from '@/common/components/Card';
import { FormGrid, FieldGroup, Label, Input } from '@/common/components/Form';
import { Toggle } from '@/common/components/Toggle';
import { DateRangePicker } from '@/common/components/DateTimePicker';
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
    // Koniec terminu jest całym dniem: kalendarz oddaje samą datę, a tu dokładamy 23:59:59.
    const handleEndDateChange = (value: string) => {
        onEndDateTimeChange(`${value.split('T')[0]}T23:59:59`);
    };

    const handleAllDayToggle = (checked: boolean) => {
        onIsAllDayChange(checked);
        const nowIso = new Date().toISOString();
        if (checked) {
            const date = (startDateTime || nowIso).split('T')[0];
            onStartDateTimeChange(date);
            onEndDateTimeChange(`${date}T23:59:59`);
        } else {
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
                    {isAllDay ? (
                        <Input
                            type="date"
                            value={startDateTime}
                            onChange={(e) => {
                                onStartDateTimeChange(e.target.value);
                                onEndDateTimeChange(`${e.target.value}T23:59:59`);
                            }}
                        />
                    ) : (
                        <DateRangePicker
                            role="start"
                            start={startDateTime}
                            end={endDateTime}
                            onStartChange={onStartDateTimeChange}
                            onEndChange={handleEndDateChange}
                            showTime
                            endHasTime={false}
                            placeholder="Wybierz datę i godzinę"
                        />
                    )}
                </FieldGroup>

                {!isAllDay && (
                    <FieldGroup>
                        <Label>{t.appointments.createView.endDate}</Label>
                        <DateRangePicker
                            role="end"
                            start={startDateTime}
                            end={endDateTime}
                            onStartChange={onStartDateTimeChange}
                            onEndChange={handleEndDateChange}
                            showTime
                            endHasTime={false}
                            placeholder="Wybierz datę"
                        />
                    </FieldGroup>
                )}
            </FormGrid>
        </Card>
    );
};
