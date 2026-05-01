// src/modules/appointments/components/SmsReminderEditSection.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentApi } from '../api/appointmentApi';
import { fetchAutomationConfig } from '@/modules/sms-campaigns/api/smsCampaignsApi';
import type { AppointmentSmsInfo } from '../types';

// ─── Toggle switch ─────────────────────────────────────────────────────────────

const ToggleLabel = styled.label<{ $disabled?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.45 : 1};
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
    background: ${p => p.$saving ? '#e2e8f0' : p.$checked ? '#6366f1' : '#cbd5e1'};
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
        box-shadow: 0 1px 4px rgba(0,0,0,0.20);
        transition: left 200ms ease;
    }
`;

const ToggleText = styled.span<{ $checked: boolean; $saving?: boolean }>`
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.$saving ? '#94a3b8' : p.$checked ? '#4f46e5' : '#94a3b8'};
    transition: color 200ms ease;
    min-width: 52px;
`;

// ─── Card shell ────────────────────────────────────────────────────────────────

const Card = styled.div`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    overflow: hidden;
`;

const CardHead = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const CardHeadIcon = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(99, 102, 241, 0.08);
    color: #6366f1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    svg { width: 16px; height: 16px; }
`;

const CardHeadTitle = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

// ─── Automation disabled banner ────────────────────────────────────────────────

const DisabledBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 20px;
    background: rgba(234, 179, 8, 0.06);
    border-bottom: 1px solid rgba(234, 179, 8, 0.18);
`;

const DisabledBannerIcon = styled.div`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 1px;
    color: #D97706;
    svg { width: 100%; height: 100%; }
`;

const DisabledBannerText = styled.div`
    font-size: 12px;
    color: #92400e;
    line-height: 1.5;
    a {
        color: #6366f1;
        font-weight: 600;
        text-decoration: none;
        &:hover { text-decoration: underline; }
    }
`;

// ─── Row items ─────────────────────────────────────────────────────────────────

const RowList = styled.div`
    display: flex;
    flex-direction: column;
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};

    &:last-child {
        border-bottom: none;
    }
`;

const RowLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
`;

const RowIcon = styled.div<{ $color?: string; $bg?: string }>`
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: ${p => p.$bg || 'rgba(99, 102, 241, 0.08)'};
    color: ${p => p.$color || '#6366f1'};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    svg { width: 16px; height: 16px; }
`;

const RowInfo = styled.div`
    min-width: 0;
`;

const RowTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
`;

const RowSub = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    margin-top: 2px;
    line-height: 1.4;
`;

const RowRight = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
`;

// ─── Status pills ──────────────────────────────────────────────────────────────

const StatusPill = styled.span<{ $variant: 'sent' | 'pending' | 'failed' | 'none' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.3px;
    background: ${p => {
        if (p.$variant === 'sent')    return 'rgba(5,150,105,0.10)';
        if (p.$variant === 'failed')  return 'rgba(220,38,38,0.09)';
        if (p.$variant === 'pending') return 'rgba(99,102,241,0.09)';
        return 'rgba(148,163,184,0.12)';
    }};
    color: ${p => {
        if (p.$variant === 'sent')    return '#059669';
        if (p.$variant === 'failed')  return '#DC2626';
        if (p.$variant === 'pending') return '#4f46e5';
        return '#64748b';
    }};
`;

const PillDot = styled.span<{ $variant: 'sent' | 'pending' | 'failed' | 'none' }>`
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${p => {
        if (p.$variant === 'sent')    return '#059669';
        if (p.$variant === 'failed')  return '#DC2626';
        if (p.$variant === 'pending') return '#6366f1';
        return '#94a3b8';
    }};
`;

// ─── Error ─────────────────────────────────────────────────────────────────────

const ErrorText = styled.div`
    font-size: 11px;
    color: #DC2626;
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
    } catch {
        return '';
    }
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
}

export const SmsReminderEditSection = ({ appointmentId, smsInfo }: SmsReminderEditSectionProps) => {
    const queryClient = useQueryClient();
    const { confirmationSms, reminderSms } = smsInfo;

    const { data: automation } = useQuery({
        queryKey: ['sms-automation-config'],
        queryFn: fetchAutomationConfig,
        staleTime: 120_000,
    });

    const preVisitEnabled = automation?.preVisit?.enabled ?? true;

    const [reminderChecked, setReminderChecked] = useState(reminderSms.requested);

    const mutation = useMutation({
        mutationFn: (value: boolean) => appointmentApi.updateSmsPreferences(appointmentId, value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments', appointmentId] });
        },
    });

    const canEditReminder = reminderSms.editable && preVisitEnabled;

    const handleToggle = (checked: boolean) => {
        if (!canEditReminder || mutation.isPending) return;
        setReminderChecked(checked);
        mutation.mutate(checked);
    };

    const confirmVariant = smsVariant(confirmationSms?.status ?? null);
    const reminderVariant = smsVariant(reminderSms.status);

    return (
        <Card>
            <CardHead>
                <CardHeadIcon>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </CardHeadIcon>
                <CardHeadTitle>Powiadomienia SMS</CardHeadTitle>
            </CardHead>

            {!preVisitEnabled && (
                <DisabledBanner>
                    <DisabledBannerIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </DisabledBannerIcon>
                    <DisabledBannerText>
                        SMS z przypomnieniami o wizycie są <strong>wyłączone</strong> w konfiguracji systemu.
                        Włącz je w <a href="/sms-campaigns">ustawieniach SMS</a>, żeby móc planować przypomnienia.
                    </DisabledBannerText>
                </DisabledBanner>
            )}

            <RowList>
                {/* Confirmation SMS */}
                <Row>
                    <RowLeft>
                        <RowIcon
                            $color={confirmationSms ? '#059669' : '#94a3b8'}
                            $bg={confirmationSms ? 'rgba(5,150,105,0.08)' : 'rgba(148,163,184,0.10)'}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2 11 13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </RowIcon>
                        <RowInfo>
                            <RowTitle>SMS potwierdzenia rezerwacji</RowTitle>
                            <RowSub>
                                {confirmationSms
                                    ? `Wysłany ${formatDateTime(confirmationSms.sentAt)}`
                                    : 'Nie wysłano przy tworzeniu rezerwacji'}
                            </RowSub>
                        </RowInfo>
                    </RowLeft>
                    <RowRight>
                        {confirmationSms ? (
                            <StatusPill $variant={confirmVariant}>
                                <PillDot $variant={confirmVariant} />
                                {confirmationSms.status === 'SENT' ? 'Wysłany' : 'Błąd'}
                            </StatusPill>
                        ) : (
                            <StatusPill $variant="none">
                                <PillDot $variant="none" />
                                Nie wysłano
                            </StatusPill>
                        )}
                    </RowRight>
                </Row>

                {/* Reminder SMS */}
                <Row>
                    <RowLeft>
                        <RowIcon
                            $color={reminderSms.requested ? '#6366f1' : '#94a3b8'}
                            $bg={reminderSms.requested ? 'rgba(99,102,241,0.08)' : 'rgba(148,163,184,0.10)'}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </RowIcon>
                        <RowInfo>
                            <RowTitle>SMS z przypomnieniem o wizycie</RowTitle>
                            <RowSub>
                                {!preVisitEnabled
                                    ? 'Wyłączone w konfiguracji SMS'
                                    : !reminderSms.editable
                                        ? reminderSms.sentAt
                                            ? `Wysłany ${formatDateTime(reminderSms.sentAt)}`
                                            : 'SMS o nadchodzącej wizycie został wysłany'
                                        : reminderChecked
                                            ? 'Zostanie wysłany 60 min przed wizytą'
                                            : 'Wyłączone dla tej rezerwacji'}
                            </RowSub>
                            {mutation.isError && (
                                <ErrorText>Nie udało się zapisać. Spróbuj ponownie.</ErrorText>
                            )}
                        </RowInfo>
                    </RowLeft>
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
                                <ToggleTrack $checked={reminderChecked} $saving={mutation.isPending} />
                                <ToggleText $checked={reminderChecked} $saving={mutation.isPending}>
                                    {mutation.isPending ? '…' : reminderChecked ? 'Włączone' : 'Wyłączone'}
                                </ToggleText>
                            </ToggleLabel>
                        )}
                    </RowRight>
                </Row>
            </RowList>
        </Card>
    );
};
