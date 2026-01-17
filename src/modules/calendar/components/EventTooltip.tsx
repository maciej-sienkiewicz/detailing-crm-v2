// src/modules/calendar/components/EventTooltip.tsx

import React from 'react';
import styled from 'styled-components';
import type { AppointmentEventData, VisitEventData } from '../types';

const TooltipContainer = styled.div`
    position: absolute;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 16px;
    min-width: 280px;
    z-index: 1000;
    pointer-events: none;
`;

const TooltipHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e5e7eb;
`;

const EventTypeIcon = styled.span<{ $color: string }>`
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: ${props => props.$color};
    flex-shrink: 0;
`;

const EventTitle = styled.div`
    font-weight: 600;
    font-size: 14px;
    color: #1f2937;
    flex: 1;
`;

const InfoRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
`;

const InfoLabel = styled.span`
    font-size: 13px;
    color: #6b7280;
    min-width: 80px;
`;

const InfoValue = styled.span`
    font-size: 13px;
    color: #1f2937;
    font-weight: 500;
`;

const StatusBadge = styled.span<{ $status: string }>`
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    background-color: ${props => {
        switch (props.$status) {
            case 'IN_PROGRESS':
                return '#fef3c7';
            case 'READY_FOR_PICKUP':
                return '#d1fae5';
            case 'COMPLETED':
                return '#dbeafe';
            case 'REJECTED':
                return '#fee2e2';
            case 'ARCHIVED':
                return '#f3f4f6';
            default:
                return '#f3f4f6';
        }
    }};
    color: ${props => {
        switch (props.$status) {
            case 'IN_PROGRESS':
                return '#92400e';
            case 'READY_FOR_PICKUP':
                return '#065f46';
            case 'COMPLETED':
                return '#1e40af';
            case 'REJECTED':
                return '#991b1b';
            case 'ARCHIVED':
                return '#4b5563';
            default:
                return '#4b5563';
        }
    }};
`;

const formatPrice = (price?: number, currency?: string) => {
    if (!price) return 'Brak';
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: currency || 'PLN',
    }).format(price);
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

interface EventTooltipProps {
    eventData: AppointmentEventData | VisitEventData;
    position: { x: number; y: number };
}

export const EventTooltip: React.FC<EventTooltipProps> = ({ eventData, position }) => {
    const isAppointment = eventData.type === 'APPOINTMENT';
    const isVisit = eventData.type === 'VISIT';

    return (
        <TooltipContainer style={{ left: position.x, top: position.y }}>
            <TooltipHeader>
                <EventTypeIcon $color={eventData.colorHex} />
                <EventTitle>
                    {isAppointment
                        ? (eventData as AppointmentEventData).appointmentTitle || 'Wizyta'
                        : `🔧 ${(eventData as VisitEventData).visitNumber}`
                    }
                </EventTitle>
            </TooltipHeader>

            <InfoRow>
                <InfoLabel>Klient:</InfoLabel>
                <InfoValue>{eventData.customerName}</InfoValue>
            </InfoRow>

            {eventData.customerPhone && (
                <InfoRow>
                    <InfoLabel>Telefon:</InfoLabel>
                    <InfoValue>{eventData.customerPhone}</InfoValue>
                </InfoRow>
            )}

            <InfoRow>
                <InfoLabel>Pojazd:</InfoLabel>
                <InfoValue>{eventData.vehicleInfo}</InfoValue>
            </InfoRow>

            {isVisit && (
                <>
                    <InfoRow>
                        <InfoLabel>Tablica:</InfoLabel>
                        <InfoValue>{(eventData as VisitEventData).licensePlate}</InfoValue>
                    </InfoRow>

                    <InfoRow>
                        <InfoLabel>Status:</InfoLabel>
                        <StatusBadge $status={(eventData as VisitEventData).status}>
                            {formatStatus((eventData as VisitEventData).status)}
                        </StatusBadge>
                    </InfoRow>
                </>
            )}

            {isAppointment && (eventData as AppointmentEventData).serviceNames.length > 0 && (
                <InfoRow>
                    <InfoLabel>Usługi:</InfoLabel>
                    <InfoValue>
                        {(eventData as AppointmentEventData).serviceNames.join(', ')}
                    </InfoValue>
                </InfoRow>
            )}

            {eventData.totalPrice !== undefined && (
                <InfoRow>
                    <InfoLabel>Cena:</InfoLabel>
                    <InfoValue>{formatPrice(eventData.totalPrice, eventData.currency)}</InfoValue>
                </InfoRow>
            )}
        </TooltipContainer>
    );
};
