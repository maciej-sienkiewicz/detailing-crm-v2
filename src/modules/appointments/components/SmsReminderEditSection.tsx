// src/modules/appointments/components/SmsReminderEditSection.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { appointmentApi } from '../api/appointmentApi';
import type { AppointmentSmsInfo } from '../types';

const SectionBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md} 0;
`;

const CheckboxRow = styled.label<{ $disabled?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.md};
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    user-select: none;
    opacity: ${props => props.$disabled ? 0.55 : 1};
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })<{ disabled?: boolean }>`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 1px;
    accent-color: ${props => props.theme.colors.primary};
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
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

const StatusRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const StatusItem = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const StatusBadge = styled.span<{ $status: 'SENT' | 'FAILED' | 'PENDING' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.3px;
    background: ${props => {
        if (props.$status === 'SENT') return 'rgba(5, 150, 105, 0.12)';
        if (props.$status === 'FAILED') return 'rgba(220, 38, 38, 0.10)';
        return 'rgba(234, 179, 8, 0.12)';
    }};
    color: ${props => {
        if (props.$status === 'SENT') return '#059669';
        if (props.$status === 'FAILED') return '#DC2626';
        return '#B45309';
    }};
`;

const StatusDot = styled.span<{ $status: 'SENT' | 'FAILED' | 'PENDING' }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => {
        if (props.$status === 'SENT') return '#059669';
        if (props.$status === 'FAILED') return '#DC2626';
        return '#D97706';
    }};
    flex-shrink: 0;
`;

const Divider = styled.div`
    height: 1px;
    background: ${props => props.theme.colors.border};
`;

const StatusLabel = styled.span`
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

const ErrorMsg = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: #DC2626;
    margin-top: 4px;
`;

const formatDateTime = (iso: string | null): string => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('pl-PL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return iso;
    }
};

interface SmsReminderEditSectionProps {
    appointmentId: string;
    smsInfo: AppointmentSmsInfo;
}

export const SmsReminderEditSection = ({ appointmentId, smsInfo }: SmsReminderEditSectionProps) => {
    const queryClient = useQueryClient();
    const { confirmationSms, reminderSms } = smsInfo;

    const [reminderChecked, setReminderChecked] = useState(reminderSms.requested);

    const mutation = useMutation({
        mutationFn: (value: boolean) => appointmentApi.updateSmsPreferences(appointmentId, value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments', appointmentId] });
        },
    });

    const handleReminderChange = (checked: boolean) => {
        setReminderChecked(checked);
        mutation.mutate(checked);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Powiadomienia SMS</CardTitle>
            </CardHeader>

            <SectionBody>
                {/* Confirmation SMS status */}
                <StatusRow>
                    <StatusItem>
                        <StatusLabel>SMS potwierdzenia:</StatusLabel>
                        {confirmationSms ? (
                            <>
                                <StatusBadge $status={confirmationSms.status}>
                                    <StatusDot $status={confirmationSms.status} />
                                    {confirmationSms.status === 'SENT' ? 'Wysłany' : 'Błąd wysyłki'}
                                </StatusBadge>
                                <span>{formatDateTime(confirmationSms.sentAt)}</span>
                            </>
                        ) : (
                            <span>Nie wysłano</span>
                        )}
                    </StatusItem>
                </StatusRow>

                <Divider />

                {/* Reminder SMS — editable checkbox or sent status */}
                <CheckboxRow
                    $disabled={!reminderSms.editable}
                    onClick={e => !reminderSms.editable && e.preventDefault()}
                >
                    <Checkbox
                        checked={reminderChecked}
                        disabled={!reminderSms.editable || mutation.isPending}
                        onChange={e => reminderSms.editable && handleReminderChange(e.target.checked)}
                    />
                    <CheckboxLabel>
                        <CheckboxTitle>
                            Wyślij SMS przypominający przed wizytą
                            {reminderSms.status && (
                                <StatusBadge $status={reminderSms.status} style={{ marginLeft: 8 }}>
                                    <StatusDot $status={reminderSms.status} />
                                    {reminderSms.status === 'SENT' && 'Wysłany'}
                                    {reminderSms.status === 'PENDING' && 'Oczekuje'}
                                    {reminderSms.status === 'FAILED' && 'Błąd'}
                                </StatusBadge>
                            )}
                        </CheckboxTitle>
                        <CheckboxDesc>
                            {reminderSms.editable
                                ? 'SMS zostanie wysłany automatycznie 60 minut przed wizytą'
                                : reminderSms.sentAt
                                    ? `Wysłany ${formatDateTime(reminderSms.sentAt)} — nie można edytować`
                                    : 'SMS z przypomnieniem został już wysłany — nie można edytować'}
                        </CheckboxDesc>
                        {mutation.isError && (
                            <ErrorMsg>Błąd zapisu preferencji SMS. Spróbuj ponownie.</ErrorMsg>
                        )}
                    </CheckboxLabel>
                </CheckboxRow>
            </SectionBody>
        </Card>
    );
};
