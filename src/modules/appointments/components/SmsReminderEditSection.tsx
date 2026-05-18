// src/modules/appointments/components/SmsReminderEditSection.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';
import { appointmentApi } from '../api/appointmentApi';
import { fetchAutomationConfig } from '@/modules/sms-campaigns/api/smsCampaignsApi';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { AppointmentSmsInfo } from '../types';

// ─── Layout — identyczna z VerificationStep ────────────────────────────────────

const SectionCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const SectionHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
`;

const SectionTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const SectionNum = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${st.accentBlue};
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
`;

const SectionLabel = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${st.text};
`;

const SectionBody = styled.div`
    padding: 0;
`;

// ─── Banner — automation disabled ─────────────────────────────────────────────

const Banner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 20px;
    background: rgba(245, 158, 11, 0.06);
    border-bottom: 1px solid rgba(245, 158, 11, 0.18);
`;

const BannerText = styled.div`
    font-size: 12px;
    color: #92400e;
    line-height: 1.55;
    a {
        color: ${st.accentBlue};
        font-weight: 600;
        text-decoration: none;
        &:hover { text-decoration: underline; }
    }
`;

// ─── Rows ──────────────────────────────────────────────────────────────────────

const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 20px;
    border-bottom: 1px solid ${st.border};

    &:last-child {
        border-bottom: none;
    }
`;

const RowInfo = styled.div`
    min-width: 0;
    flex: 1;
`;

const RowTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
`;

const RowSub = styled.div`
    font-size: 12px;
    color: ${st.textMuted};
    margin-top: 3px;
    line-height: 1.45;
`;

const RowRight = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
`;

// ─── Toggle switch ─────────────────────────────────────────────────────────────

const ToggleLabel = styled.label<{ $disabled?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.4 : 1};
    user-select: none;
`;

const ToggleInput = styled.input.attrs({ type: 'checkbox' })`
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
`;

const ToggleTrack = styled.span<{ $checked: boolean; $saving?: boolean }>`
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
    border-radius: 11px;
    background: ${p => p.$saving ? st.border : p.$checked ? st.accentBlue : st.borderHover};
    transition: background 200ms ease;
    flex-shrink: 0;

    &::after {
        content: '';
        position: absolute;
        top: 3px;
        left: ${p => p.$checked ? '21px' : '3px'};
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.20);
        transition: left 200ms ease;
    }
`;

const ToggleText = styled.span<{ $checked: boolean; $saving?: boolean }>`
    font-size: 12px;
    font-weight: 600;
    min-width: 58px;
    color: ${p => p.$saving ? st.textMuted : p.$checked ? st.accentBlue : st.textMuted};
    transition: color 200ms ease;
`;

// ─── Status pill ───────────────────────────────────────────────────────────────

const StatusPill = styled.span<{ $variant: 'sent' | 'pending' | 'failed' | 'none' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.2px;
    background: ${p => {
        if (p.$variant === 'sent')    return st.accentGreenDim;
        if (p.$variant === 'failed')  return st.accentRedDim;
        if (p.$variant === 'pending') return st.accentBlueDim;
        return st.bgCardAlt;
    }};
    color: ${p => {
        if (p.$variant === 'sent')    return st.accentGreen;
        if (p.$variant === 'failed')  return st.accentRed;
        if (p.$variant === 'pending') return st.accentBlue;
        return st.textMuted;
    }};
`;

const PillDot = styled.span<{ $variant: 'sent' | 'pending' | 'failed' | 'none' }>`
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${p => {
        if (p.$variant === 'sent')    return st.accentGreen;
        if (p.$variant === 'failed')  return st.accentRed;
        if (p.$variant === 'pending') return st.accentBlue;
        return st.textMuted;
    }};
`;

const ErrorText = styled.div`
    font-size: 11px;
    color: ${st.accentRed};
    margin-top: 3px;
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatDateTime = (iso: string | null): string => {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('pl-PL', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return ''; }
};

const smsVariant = (status: string | null): 'sent' | 'pending' | 'failed' | 'none' => {
    if (status === 'SENT')    return 'sent';
    if (status === 'PENDING') return 'pending';
    if (status === 'FAILED')  return 'failed';
    return 'none';
};

// ─── Component ─────────────────────────────────────────────────────────────────

interface SmsReminderEditSectionProps {
    appointmentId: string;
    smsInfo: AppointmentSmsInfo;
    stepNumber?: number;
}

export const SmsReminderEditSection = ({
    appointmentId,
    smsInfo,
    stepNumber,
}: SmsReminderEditSectionProps) => {
    const queryClient = useQueryClient();
    const smsFeature = useFeature('SMS_EMAIL');
    const { confirmationSms, reminderSms } = smsInfo;

    const { data: automation } = useQuery({
        queryKey: ['sms-automation-config'],
        queryFn: fetchAutomationConfig,
    });

    const preVisitEnabled = automation?.preVisit?.enabled ?? true;
    const canEditReminder = reminderSms.editable && preVisitEnabled;

    const [reminderChecked, setReminderChecked] = useState(reminderSms.requested);

    const mutation = useMutation({
        mutationFn: (value: boolean) => appointmentApi.updateSmsPreferences(appointmentId, value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments', appointmentId] });
        },
    });

    const handleToggle = (checked: boolean) => {
        if (!canEditReminder || mutation.isPending) return;
        setReminderChecked(checked);
        mutation.mutate(checked);
    };

    const confirmVariant = smsVariant(confirmationSms?.status ?? null);
    const reminderVariant = smsVariant(reminderSms.status);

    return (
        <SectionCard>
            <SectionHead>
                <SectionTitleRow>
                    {stepNumber !== undefined && <SectionNum>{stepNumber}</SectionNum>}
                    <SectionLabel>Powiadomienia SMS</SectionLabel>
                </SectionTitleRow>
            </SectionHead>

            <SectionBody>
            <LockedSection
                locked={!smsFeature.enabled}
                message="Twój abonament nie obsługuje powiadomień SMS."
            >
                {!preVisitEnabled && (
                    <Banner>
                        <BannerText>
                            SMS z przypomnieniami o wizycie są <strong>wyłączone</strong> w konfiguracji systemu.{' '}
                            Włącz je w <a href="/sms-campaigns">ustawieniach SMS</a>, żeby planować przypomnienia.
                        </BannerText>
                    </Banner>
                )}

                {/* Potwierdzenie */}
                <Row>
                    <RowInfo>
                        <RowTitle>SMS potwierdzenia rezerwacji</RowTitle>
                        <RowSub>
                            {confirmationSms
                                ? `Wysłany ${formatDateTime(confirmationSms.sentAt)}`
                                : 'Nie wysłano — checkbox nie był zaznaczony przy tworzeniu'}
                        </RowSub>
                    </RowInfo>
                    <RowRight>
                        <StatusPill $variant={confirmVariant}>
                            <PillDot $variant={confirmVariant} />
                            {confirmationSms
                                ? (confirmationSms.status === 'SENT' ? 'Wysłany' : 'Błąd')
                                : 'Nie wysłano'}
                        </StatusPill>
                    </RowRight>
                </Row>

                {/* Przypomnienie */}
                <Row>
                    <RowInfo>
                        <RowTitle>SMS przypomnienia o wizycie</RowTitle>
                        <RowSub>
                            {!preVisitEnabled
                                ? 'Wyłączone globalnie w konfiguracji SMS'
                                : !reminderSms.editable
                                    ? (reminderSms.sentAt
                                        ? `Wysłany ${formatDateTime(reminderSms.sentAt)}`
                                        : 'SMS o nadchodzącej wizycie został wysłany')
                                    : reminderChecked
                                        ? 'Zostanie wysłany automatycznie 60 min przed wizytą'
                                        : 'Wyłączone dla tej rezerwacji'}
                        </RowSub>
                        {mutation.isError && (
                            <ErrorText>Nie udało się zapisać. Spróbuj ponownie.</ErrorText>
                        )}
                    </RowInfo>
                    <RowRight>
                        {!reminderSms.editable ? (
                            <StatusPill $variant={reminderVariant}>
                                <PillDot $variant={reminderVariant} />
                                {reminderSms.status === 'SENT'    && 'Wysłany'}
                                {reminderSms.status === 'PENDING' && 'Oczekuje'}
                                {reminderSms.status === 'FAILED'  && 'Błąd'}
                                {!reminderSms.status              && 'Nie wysłano'}
                            </StatusPill>
                        ) : (
                            <ToggleLabel $disabled={!canEditReminder || mutation.isPending}>
                                <ToggleInput
                                    checked={reminderChecked}
                                    disabled={!canEditReminder || mutation.isPending}
                                    onChange={e => handleToggle(e.target.checked)}
                                />
                                <ToggleTrack $checked={canEditReminder && reminderChecked} $saving={mutation.isPending} />
                                <ToggleText $checked={canEditReminder && reminderChecked} $saving={mutation.isPending}>
                                    {mutation.isPending ? 'Zapisuję…' : (canEditReminder && reminderChecked) ? 'Włączone' : 'Wyłączone'}
                                </ToggleText>
                            </ToggleLabel>
                        )}
                    </RowRight>
                </Row>
            </LockedSection>
            </SectionBody>
        </SectionCard>
    );
};
