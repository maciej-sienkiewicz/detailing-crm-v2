// src/modules/calendar/components/EventSummaryPopover.tsx

import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppointmentEventData, VisitEventData, SmsSendStatus, CalendarSmsInfo } from '../types';
import { appointmentApi } from '@/modules/appointments/api/appointmentApi';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(15, 23, 42, 0.1);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
`;

const PopoverContainer = styled.div<{ $x: number; $y: number }>`
    position: fixed;
    left: ${props => props.$x}px;
    top: ${props => props.$y}px;
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 20px;
    box-shadow:
        0 4px 6px rgba(0, 0, 0, 0.02),
        0 12px 24px rgba(0, 0, 0, 0.06),
        0 24px 48px rgba(0, 0, 0, 0.08);
    width: 390px;
    max-height: 600px;
    z-index: 1000;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.8);
    display: flex;
    flex-direction: column;

    @media (max-width: 480px) {
        width: calc(100vw - 24px);
        left: 12px !important;
        max-height: 80vh;
    }
`;

const PopoverHeader = styled.div<{ $color: string }>`
    padding: 22px 24px;
    background: ${props => props.$color};
    color: white;
    border-bottom: none;
    position: relative;
    overflow: hidden;

    &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
        pointer-events: none;
    }
`;

const EventTitle = styled.h3`
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 700;
    color: inherit;
    position: relative;
    z-index: 1;
`;

const EventType = styled.div`
    font-size: 11px;
    opacity: 0.85;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    font-weight: 700;
    position: relative;
    z-index: 1;
`;

const PopoverBody = styled.div`
    padding: 22px 24px;
    overflow-y: auto;
    flex: 1;
`;

const Section = styled.div`
    margin-bottom: 20px;

    &:last-child {
        margin-bottom: 0;
    }
`;

const InfoColumns = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;

    @media (max-width: 400px) {
        grid-template-columns: 1fr;
        gap: 12px;
    }
`;

const SectionTitle = styled.div`
    font-size: 10px;
    font-weight: 800;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
`;

const InfoRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    font-size: 14px;
    color: #1e293b;
`;

const InfoRowLink = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    margin: 0 -8px;
    font-size: 14px;
    color: #1e293b;
    width: calc(100% + 16px);
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: background 180ms ease, color 180ms ease;

    &:hover {
        background: rgba(99, 102, 241, 0.06);
        color: #6366f1;
    }

    &:hover .nav-arrow {
        opacity: 1;
        transform: translateX(2px);
    }
`;

const InfoIcon = styled.div`
    width: 16px;
    height: 16px;
    color: #94a3b8;
    flex-shrink: 0;

    svg {
        width: 100%;
        height: 100%;
    }
`;

const InfoValue = styled.div`
    flex: 1;
    color: #1e293b;
    font-weight: 500;
`;

const InfoValueText = styled.span`
    flex: 1;
    font-weight: 500;
`;

const NavArrow = styled.div`
    width: 14px;
    height: 14px;
    color: #94a3b8;
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 180ms ease, transform 180ms ease;

    svg {
        width: 100%;
        height: 100%;
    }
`;

const ServicesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const ServiceItem = styled.div`
    padding: 10px 14px;
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-radius: 10px;
    font-size: 13px;
    color: #1e293b;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
`;

const ServiceBullet = styled.div`
    width: 7px;
    height: 7px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 1px 4px rgba(99, 102, 241, 0.3);
`;

const PricesContainer = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 12px;
`;

const PriceTag = styled.div`
    font-size: 17px;
    font-weight: 800;
    color: #0f172a;
    padding: 14px 12px;
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-radius: 14px;
    text-align: center;
    letter-spacing: -0.3px;
`;

const PriceLabel = styled.div`
    font-size: 10px;
    color: #94a3b8;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 6px;
`;

const PopoverFooter = styled.div`
    padding: 16px 20px;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    background: rgba(248, 250, 252, 0.6);
    flex-shrink: 0;
`;

const FooterActions = styled.div`
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    flex-wrap: nowrap;
`;

const IconActionButton = styled.button<{ $variant?: 'default' | 'primary' | 'danger' }>`
    flex: 1 1 0;
    min-width: 0;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #334155;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    padding: 0 10px;

    &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        transform: translateY(-1px);
    }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(99,102,241,0.25);
    }

    &:active {
        transform: scale(0.97);
    }

    ${props => props.$variant === 'primary' ? `
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: white;
        border-color: transparent;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        &:hover {
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            transform: translateY(-1px);
            background: linear-gradient(135deg, #4f46e5, #4338ca);
        }
        &:focus-visible { box-shadow: 0 0 0 3px rgba(99,102,241,0.4); }
    ` : ''}

    ${props => props.$variant === 'danger' ? `
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: #ffffff;
        border-color: transparent;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
        &:hover {
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
            transform: translateY(-1px);
            background: linear-gradient(135deg, #dc2626, #b91c1c);
        }
        &:focus-visible { box-shadow: 0 0 0 3px rgba(239,68,68,0.35); }
    ` : ''}
`;

const ManageButton = styled.button`
    width: 100%;
    padding: 14px 20px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: white;
    border: none;
    border-radius: 14px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    letter-spacing: 0.3px;

    &:hover {
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
        transform: translateY(-1px);
        background: linear-gradient(135deg, #4f46e5, #4338ca);
    }

    &:active {
        transform: scale(0.98);
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const EmptyState = styled.div`
    padding: 12px 14px;
    color: #94a3b8;
    font-size: 13px;
    font-style: italic;
    background: #f8fafc;
    border-radius: 10px;
`;

const SmsSection = styled.div`
    background: #f8fafc;
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SmsRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const SmsRowLabel = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    flex-shrink: 0;
`;

const SmsBadge = styled.span<{ $status: SmsSendStatus | 'NONE' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.2px;
    background: ${props => {
        if (props.$status === 'SENT') return 'rgba(5, 150, 105, 0.11)';
        if (props.$status === 'FAILED') return 'rgba(220, 38, 38, 0.09)';
        if (props.$status === 'PENDING') return 'rgba(234, 179, 8, 0.11)';
        return 'rgba(148, 163, 184, 0.15)';
    }};
    color: ${props => {
        if (props.$status === 'SENT') return '#059669';
        if (props.$status === 'FAILED') return '#DC2626';
        if (props.$status === 'PENDING') return '#B45309';
        return '#64748B';
    }};
`;

const SmsDot = styled.span<{ $status: SmsSendStatus | 'NONE' }>`
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${props => {
        if (props.$status === 'SENT') return '#059669';
        if (props.$status === 'FAILED') return '#DC2626';
        if (props.$status === 'PENDING') return '#D97706';
        return '#94A3B8';
    }};
    flex-shrink: 0;
`;

const SmsToggle = styled.label<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${props => props.$disabled ? 0.5 : 1};
`;

const SmsToggleInput = styled.input.attrs({ type: 'checkbox' })`
    width: 15px;
    height: 15px;
    accent-color: #6366f1;
    cursor: inherit;
    flex-shrink: 0;
`;

const SmsToggleText = styled.span<{ $saving?: boolean }>`
    font-size: 11px;
    font-weight: 600;
    color: ${props => props.$saving ? '#94a3b8' : '#334155'};
`;

const SmsDivider = styled.div`
    height: 1px;
    background: rgba(0,0,0,0.06);
`;

const SmsNotSent = styled.span`
    font-size: 11px;
    color: #94a3b8;
    font-weight: 500;
`;

const NotesContainer = styled.div`
    padding: 14px;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border-radius: 12px;
    border-left: 4px solid #f59e0b;
`;

const NotesLabel = styled.div`
    font-size: 11px;
    font-weight: 800;
    color: #92400e;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const NotesText = styled.div`
    font-size: 13px;
    color: #78350f;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
`;

const StatusBlock = styled.div<{ $status: 'ABANDONED' | 'CANCELLED' }>`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 12px;
    margin-bottom: 20px;

    ${props => props.$status === 'ABANDONED' ? `
        background: linear-gradient(135deg, #fffbeb, #fef3c7);
        border-left: 4px solid #f59e0b;
    ` : `
        background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        border-left: 4px solid #94a3b8;
    `}
`;

const StatusBlockIcon = styled.div<{ $status: 'ABANDONED' | 'CANCELLED' }>`
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    ${props => props.$status === 'ABANDONED' ? `
        background: #f59e0b;
        color: white;
    ` : `
        background: #94a3b8;
        color: white;
    `}

    svg { width: 16px; height: 16px; }
`;

const StatusBlockContent = styled.div`
    flex: 1;
    min-width: 0;
`;

const StatusBlockTitle = styled.div<{ $status: 'ABANDONED' | 'CANCELLED' }>`
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 4px;

    ${props => props.$status === 'ABANDONED' ? `
        color: #92400e;
    ` : `
        color: #475569;
    `}
`;

const StatusBlockDesc = styled.div`
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
`;

// ─── SMS subcomponent ─────────────────────────────────────────────────────────

const smsBadgeLabel = (status: SmsSendStatus | null): string => {
    if (status === 'SENT') return 'Wysłany';
    if (status === 'FAILED') return 'Błąd';
    if (status === 'PENDING') return 'Oczekuje';
    return '';
};

const AppointmentSmsSection: React.FC<{ appointmentId: string; smsInfo: CalendarSmsInfo }> = ({
    appointmentId,
    smsInfo,
}) => {
    const queryClient = useQueryClient();
    const [reminderChecked, setReminderChecked] = useState(smsInfo.reminderSms.requested);

    const mutation = useMutation({
        mutationFn: (value: boolean) => appointmentApi.updateSmsPreferences(appointmentId, value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        },
    });

    const handleToggle = (checked: boolean) => {
        if (!smsInfo.reminderSms.editable || mutation.isPending) return;
        setReminderChecked(checked);
        mutation.mutate(checked);
    };

    const { confirmationSms, reminderSms } = smsInfo;

    return (
        <SmsSection>
            {/* Confirmation SMS */}
            <SmsRow>
                <SmsRowLabel>Potwierdzenie</SmsRowLabel>
                {confirmationSms ? (
                    <SmsBadge $status={confirmationSms.status}>
                        <SmsDot $status={confirmationSms.status} />
                        {smsBadgeLabel(confirmationSms.status)}
                    </SmsBadge>
                ) : (
                    <SmsNotSent>Nie wysłano</SmsNotSent>
                )}
            </SmsRow>

            <SmsDivider />

            {/* Reminder SMS */}
            <SmsRow>
                <SmsRowLabel>Przypomnienie</SmsRowLabel>
                {reminderSms.editable ? (
                    <SmsToggle $disabled={mutation.isPending}>
                        <SmsToggleInput
                            checked={reminderChecked}
                            disabled={mutation.isPending}
                            onChange={e => handleToggle(e.target.checked)}
                        />
                        <SmsToggleText $saving={mutation.isPending}>
                            {mutation.isPending ? 'Zapisywanie…' : (reminderChecked ? 'Zaplanowany' : 'Wyłączony')}
                        </SmsToggleText>
                    </SmsToggle>
                ) : reminderSms.status ? (
                    <SmsBadge $status={reminderSms.status}>
                        <SmsDot $status={reminderSms.status} />
                        {smsBadgeLabel(reminderSms.status)}
                    </SmsBadge>
                ) : (
                    <SmsNotSent>Nie wysłano</SmsNotSent>
                )}
            </SmsRow>
        </SmsSection>
    );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface EventSummaryPopoverProps {
    event: AppointmentEventData | VisitEventData;
    position: { x: number; y: number };
    onClose: () => void;
    onManageClick: () => void; // used for visits navigation
    onEditReservationClick?: () => void;
    onStartVisitClick?: () => void;
    onCancelReservationClick?: () => void;
    onRestoreAppointmentClick?: () => void;
    onDeleteAppointmentClick?: () => void;
}

export const EventSummaryPopover: React.FC<EventSummaryPopoverProps> = ({
    event,
    position,
    onClose,
    onManageClick,
    onEditReservationClick,
    onStartVisitClick,
    onCancelReservationClick,
    onRestoreAppointmentClick,
    onDeleteAppointmentClick,
}) => {
    const navigate = useNavigate();
    const isAppointment = event.type === 'APPOINTMENT';

    // Check if appointment is cancelled/abandoned - don't show "Porzuć" button
    const appointmentStatus = isAppointment ? (event as AppointmentEventData).status : undefined;
    const isCancelled = appointmentStatus === 'CANCELLED' || appointmentStatus === 'ABANDONED';

    // Get appropriate note based on event type
    const eventNote = isAppointment
        ? (event as AppointmentEventData).note
        : (event as VisitEventData).technicalNotes;

    const formatPrice = (amount?: number, currency?: string) => {
        if (!amount) return '—';
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: currency || 'PLN',
        }).format(amount / 100);
    };

    const formatStatus = (status: string) => {
        const statusMap: Record<string, string> = {
            'IN_PROGRESS': 'W trakcie',
            'READY_FOR_PICKUP': 'Gotowe do odbioru',
            'COMPLETED': 'Zakończone',
            'REJECTED': 'Odrzucone',
            'ARCHIVED': 'Zarchiwizowane',
        };
        return statusMap[status] || status;
    };

    const formatAppointmentStatus = (status: 'ABANDONED' | 'CANCELLED') => {
        if (status === 'ABANDONED') return 'Porzucona';
        return 'Anulowana';
    };

    const formatAppointmentStatusDescription = (status: 'ABANDONED' | 'CANCELLED') => {
        if (status === 'ABANDONED') {
            return 'Rezerwacja była zapisana, ale klient nie przyjechał lub kontakt się urwał.';
        }
        return 'Administrator zgodził się na anulowanie rezerwacji.';
    };

    return (
        <>
            <Overlay onClick={onClose} />
            <PopoverContainer $x={position.x} $y={position.y}>
                <PopoverHeader $color={event.colorHex || '#3b82f6'}>
                    <EventType>{isAppointment ? 'Rezerwacja' : 'Wizyta'}</EventType>
                </PopoverHeader>

                <PopoverBody>
                    {/* Status blok - dla porzuconych/anulowanych rezerwacji */}
                    {isAppointment && isCancelled && appointmentStatus && (appointmentStatus === 'ABANDONED' || appointmentStatus === 'CANCELLED') && (
                        <StatusBlock $status={appointmentStatus as 'ABANDONED' | 'CANCELLED'}>
                            <StatusBlockIcon $status={appointmentStatus as 'ABANDONED' | 'CANCELLED'}>
                                {appointmentStatus === 'ABANDONED' ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M15 9l-6 6M9 9l6 6" />
                                    </svg>
                                )}
                            </StatusBlockIcon>
                            <StatusBlockContent>
                                <StatusBlockTitle $status={appointmentStatus as 'ABANDONED' | 'CANCELLED'}>
                                    {formatAppointmentStatus(appointmentStatus as 'ABANDONED' | 'CANCELLED')}
                                </StatusBlockTitle>
                                <StatusBlockDesc>
                                    {formatAppointmentStatusDescription(appointmentStatus as 'ABANDONED' | 'CANCELLED')}
                                </StatusBlockDesc>
                            </StatusBlockContent>
                        </StatusBlock>
                    )}

                    <InfoColumns>
                        {/* Klient */}
                        <Section>
                            <SectionTitle>Klient</SectionTitle>
                            {event.customerId ? (
                                <InfoRowLink onClick={() => { onClose(); navigate(`/customers/${event.customerId}`); }}>
                                    <InfoIcon>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </InfoIcon>
                                    <InfoValueText>{event.customerName}</InfoValueText>
                                    <NavArrow className="nav-arrow">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </NavArrow>
                                </InfoRowLink>
                            ) : (
                                <InfoRow>
                                    <InfoIcon>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </InfoIcon>
                                    <InfoValue>{event.customerName}</InfoValue>
                                </InfoRow>
                            )}
                            {event.customerPhone && (
                                <InfoRow>
                                    <InfoIcon>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                                        </svg>
                                    </InfoIcon>
                                    <InfoValue>{event.customerPhone}</InfoValue>
                                </InfoRow>
                            )}
                            {event.customerEmail && (
                                <InfoRow>
                                    <InfoIcon>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                            <polyline points="22,6 12,13 2,6" />
                                        </svg>
                                    </InfoIcon>
                                    <InfoValue>{event.customerEmail}</InfoValue>
                                </InfoRow>
                            )}
                        </Section>

                        {/* Pojazd */}
                        <Section>
                            <SectionTitle>Pojazd</SectionTitle>
                            {event.vehicleId ? (
                                <InfoRowLink onClick={() => { onClose(); navigate(`/vehicles/${event.vehicleId}`); }}>
                                    <InfoIcon>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 17h14v-4H5v4zM3 7l2-3h14l2 3v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                            <circle cx="8.5" cy="17" r="1.5" />
                                            <circle cx="15.5" cy="17" r="1.5" />
                                        </svg>
                                    </InfoIcon>
                                    <InfoValueText>{event.vehicleInfo || '—'}</InfoValueText>
                                    <NavArrow className="nav-arrow">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </NavArrow>
                                </InfoRowLink>
                            ) : (
                                <InfoRow>
                                    <InfoIcon>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 17h14v-4H5v4zM3 7l2-3h14l2 3v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                            <circle cx="8.5" cy="17" r="1.5" />
                                            <circle cx="15.5" cy="17" r="1.5" />
                                        </svg>
                                    </InfoIcon>
                                    <InfoValue>{event.vehicleInfo || '—'}</InfoValue>
                                </InfoRow>
                            )}
                        </Section>
                    </InfoColumns>

                    {/* Usługi - tylko dla rezerwacji */}
                    {isAppointment && (event as AppointmentEventData).serviceNames && (
                        <Section>
                            <SectionTitle>Usługi</SectionTitle>
                            {(event as AppointmentEventData).serviceNames.length > 0 ? (
                                <ServicesList>
                                    {(event as AppointmentEventData).serviceNames.map((service, index) => (
                                        <ServiceItem key={index}>
                                            <ServiceBullet />
                                            {service}
                                        </ServiceItem>
                                    ))}
                                </ServicesList>
                            ) : (
                                <EmptyState>Brak przypisanych usług</EmptyState>
                            )}
                        </Section>
                    )}

                    {/* Status - dla wizyt */}
                    {!isAppointment && (
                        <Section>
                            <SectionTitle>Status</SectionTitle>
                            <InfoRow>
                                <InfoIcon>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 6v6l4 2" />
                                    </svg>
                                </InfoIcon>
                                <InfoValue>{formatStatus(event.status) || '—'}</InfoValue>
                            </InfoRow>
                        </Section>
                    )}

                    {/* SMS — tylko dla rezerwacji */}
                    {isAppointment && (event as AppointmentEventData).smsInfo && (
                        <Section>
                            <SectionTitle>Powiadomienia SMS</SectionTitle>
                            <AppointmentSmsSection
                                appointmentId={event.id}
                                smsInfo={(event as AppointmentEventData).smsInfo!}
                            />
                        </Section>
                    )}

                    {/* Notatka */}
                    {eventNote && (
                        <Section>
                            <NotesContainer>
                                <NotesLabel>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    {isAppointment ? 'Notatka' : 'Notatka'}
                                </NotesLabel>
                                <NotesText>{eventNote}</NotesText>
                            </NotesContainer>
                        </Section>
                    )}

                    {/* Ceny */}
                    {(event.totalPrice !== undefined || event.totalNet !== undefined) && (
                        <PricesContainer>
                            <div>
                                <PriceLabel>Brutto</PriceLabel>
                                <PriceTag>{formatPrice(event.totalPrice, event.currency)}</PriceTag>
                            </div>
                            <div>
                                <PriceLabel>Netto</PriceLabel>
                                <PriceTag>{formatPrice(event.totalNet, event.currency)}</PriceTag>
                            </div>
                        </PricesContainer>
                    )}
                </PopoverBody>

                {/* Footer actions */}
                <PopoverFooter>
                    {isAppointment ? (
                        <FooterActions>
                            {isCancelled ? (
                                <>
                                    <IconActionButton $variant="primary" onClick={onRestoreAppointmentClick} title="Przywróć rezerwację">PRZYWRÓĆ</IconActionButton>
                                    <IconActionButton $variant="danger" onClick={onDeleteAppointmentClick} title="Usuń rezerwację">USUŃ</IconActionButton>
                                </>
                            ) : (
                                <>
                                    <IconActionButton onClick={onEditReservationClick} title="Edytuj rezerwację">EDYTUJ</IconActionButton>
                                    <IconActionButton $variant="primary" onClick={onStartVisitClick} title="Rozpocznij wizytę">ROZPOCZNIJ</IconActionButton>
                                    <IconActionButton $variant="danger" onClick={onCancelReservationClick} title="Anuluj rezerwację">PORZUĆ</IconActionButton>
                                </>
                            )}
                        </FooterActions>
                    ) : (
                        <ManageButton onClick={onManageClick}>
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 5l7 7-7 7" />
                                </svg>
                                Przejdź do wizyty
                            </>
                        </ManageButton>
                    )}
                </PopoverFooter>
            </PopoverContainer>
        </>
    );
};
