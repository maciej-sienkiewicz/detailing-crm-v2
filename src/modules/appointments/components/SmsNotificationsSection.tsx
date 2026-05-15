// src/modules/appointments/components/SmsNotificationsSection.tsx
import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';

const CheckboxList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md} 0;
`;

const CheckboxRow = styled.label`
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.md};
    cursor: pointer;
    user-select: none;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 1px;
    accent-color: ${props => props.theme.colors.primary};
    cursor: pointer;
`;

const CheckboxLabel = styled.div``;

const CheckboxTitle = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    line-height: 1.4;
`;

const CheckboxDesc = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    margin-top: 2px;
    line-height: 1.4;
`;

const Divider = styled.div`
    height: 1px;
    background: ${props => props.theme.colors.border};
`;

interface SmsNotificationsSectionProps {
    sendConfirmationSms: boolean;
    onSendConfirmationSmsChange: (value: boolean) => void;
    sendReminderSms: boolean;
    onSendReminderSmsChange: (value: boolean) => void;
}

export const SmsNotificationsSection = ({
    sendConfirmationSms,
    onSendConfirmationSmsChange,
    sendReminderSms,
    onSendReminderSmsChange,
}: SmsNotificationsSectionProps) => {
    const smsFeature = useFeature('SMS_EMAIL');

    return (
        <Card>
            <CardHeader>
                <CardTitle>Powiadomienia SMS</CardTitle>
            </CardHeader>

            <LockedSection
                locked={!smsFeature.enabled}
                message="Twój abonament nie obsługuje powiadomień SMS."
            >
            <CheckboxList>
                <CheckboxRow>
                    <Checkbox
                        checked={sendConfirmationSms}
                        onChange={e => onSendConfirmationSmsChange(e.target.checked)}
                    />
                    <CheckboxLabel>
                        <CheckboxTitle>Wyślij SMS z potwierdzeniem rezerwacji</CheckboxTitle>
                        <CheckboxDesc>SMS zostanie wysłany natychmiast po zapisaniu rezerwacji</CheckboxDesc>
                    </CheckboxLabel>
                </CheckboxRow>

                <Divider />

                <CheckboxRow>
                    <Checkbox
                        checked={sendReminderSms}
                        onChange={e => onSendReminderSmsChange(e.target.checked)}
                    />
                    <CheckboxLabel>
                        <CheckboxTitle>Wyślij SMS przypominający o nadchodzącej wizycie</CheckboxTitle>
                    </CheckboxLabel>
                </CheckboxRow>
            </CheckboxList>
            </LockedSection>
        </Card>
    );
};
