// src/modules/calendar/components/EventSummaryPopover.tsx

import React from 'react';
import styled from 'styled-components';
import type { AppointmentEventData, VisitEventData } from '../types';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 999;
`;

const PopoverContainer = styled.div<{ $x: number; $y: number }>`
    position: fixed;
    left: ${props => props.$x}px;
    top: ${props => props.$y}px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    width: 380px;
    max-height: 600px;
    z-index: 1000;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
`;

const PopoverHeader = styled.div<{ $color: string }>`
    padding: 20px;
    background: ${props => props.$color};
    color: white;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
`;

const EventTitle = styled.h3`
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 600;
    color: inherit;
`;

const EventType = styled.div`
    font-size: 13px;
    opacity: 0.9;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
`;

const PopoverBody = styled.div`
    padding: 20px;
    overflow-y: auto;
    flex: 1;
`;

const Section = styled.div`
    margin-bottom: 20px;

    &:last-child {
        margin-bottom: 0;
    }
`;

const SectionTitle = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
`;

const InfoRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    font-size: 14px;
    color: #1f2937;
`;

const InfoIcon = styled.div`
    width: 16px;
    height: 16px;
    color: #64748b;
    flex-shrink: 0;

    svg {
        width: 100%;
        height: 100%;
    }
`;

const InfoValue = styled.div`
    flex: 1;
    color: #1f2937;
    font-weight: 400;
`;

const ServicesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const ServiceItem = styled.div`
    padding: 10px 12px;
    background: #f8fafc;
    border-radius: 6px;
    font-size: 14px;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ServiceBullet = styled.div`
    width: 6px;
    height: 6px;
    background: #3b82f6;
    border-radius: 50%;
    flex-shrink: 0;
`;

const PriceTag = styled.div`
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    padding: 12px;
    background: #f1f5f9;
    border-radius: 8px;
    text-align: center;
    margin-top: 12px;
`;

const PopoverFooter = styled.div`
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
    background: white;
    flex-shrink: 0;
`;

const ManageButton = styled.button`
    width: 100%;
    padding: 14px 20px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    &:hover {
        background: #2563eb;
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
    padding: 12px;
    color: #64748b;
    font-size: 14px;
    font-style: italic;
`;

interface EventSummaryPopoverProps {
    event: AppointmentEventData | VisitEventData;
    position: { x: number; y: number };
    onClose: () => void;
    onManageClick: () => void;
}

export const EventSummaryPopover: React.FC<EventSummaryPopoverProps> = ({
    event,
    position,
    onClose,
    onManageClick,
}) => {
    const isAppointment = event.type === 'APPOINTMENT';

    const formatPrice = (amount?: number, currency?: string) => {
        if (!amount) return '—';
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: currency || 'PLN',
        }).format(amount / 100);
    };

    return (
        <>
            <Overlay onClick={onClose} />
            <PopoverContainer $x={position.x} $y={position.y}>
                <PopoverHeader $color={event.colorHex || '#3b82f6'}>
                    <EventTitle>
                        {isAppointment
                            ? (event as AppointmentEventData).appointmentTitle || 'Rezerwacja'
                            : `Wizyta #${(event as VisitEventData).visitNumber}`}
                    </EventTitle>
                    <EventType>{isAppointment ? 'Rezerwacja' : 'Wizyta'}</EventType>
                </PopoverHeader>

                <PopoverBody>
                    {/* Klient */}
                    <Section>
                        <SectionTitle>Klient</SectionTitle>
                        <InfoRow>
                            <InfoIcon>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </InfoIcon>
                            <InfoValue>{event.customerName}</InfoValue>
                        </InfoRow>
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
                    </Section>

                    {/* Pojazd */}
                    <Section>
                        <SectionTitle>Pojazd</SectionTitle>
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
                    </Section>

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
                                <InfoValue>{event.status || '—'}</InfoValue>
                            </InfoRow>
                        </Section>
                    )}

                    {/* Cena */}
                    {event.totalPrice && (
                        <PriceTag>{formatPrice(event.totalPrice, event.currency)}</PriceTag>
                    )}
                </PopoverBody>

                {/* Footer z przyciskiem zarządzaj - tylko dla rezerwacji */}
                {isAppointment && (
                    <PopoverFooter>
                        <ManageButton onClick={onManageClick}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                            Zarządzaj
                        </ManageButton>
                    </PopoverFooter>
                )}
            </PopoverContainer>
        </>
    );
};
