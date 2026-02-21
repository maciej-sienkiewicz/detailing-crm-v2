// src/modules/calendar/components/CalendarView.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, DatesSetArg } from '@fullcalendar/core';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { operationApi } from '@/modules/operations';
import { useToast } from '@/common/components/Toast';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useCalendarFilters } from '../hooks/useCalendarFilters';
import { useQuickEventCreation } from '../hooks/useQuickEventCreation';
import { QuickEventModal, type QuickEventFormData, type QuickEventModalRef } from './QuickEventModal';
import { EventSummaryPopover } from './EventSummaryPopover';
import { CalendarFilterDropdown } from './CalendarFilterDropdown';
import type { DateRange, CalendarView as CalendarViewType, EventCreationData, AppointmentEventData, VisitEventData } from '../types';
import type { Operation } from '@/modules/operations/types';
import '../calendar.css';

const CalendarContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: linear-gradient(135deg, #fafbff 0%, #f5f7ff 100%);
    position: relative;

    /* FullCalendar base styles */
    .fc {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        height: 100%;
    }

    /* ===================== TOOLBAR ===================== */
    .fc-header-toolbar {
        padding: 20px 28px;
        margin-bottom: 0 !important;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .fc-toolbar-title {
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: -0.3px;
    }

    /* --- Buttons base --- */
    .fc-button-group {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .fc-button {
        background: #ffffff !important;
        color: #475569 !important;
        border: none !important;
        font-weight: 600 !important;
        text-transform: none !important;
        padding: 10px 20px !important;
        box-shadow: none !important;
        transition: all 0.2s ease;
        font-size: 13px !important;
        letter-spacing: 0.01em;
    }

    .fc-button:hover {
        background: #f8fafc !important;
        color: #1e293b !important;
    }

    .fc-button-active {
        background: linear-gradient(135deg, #6366f1, #4f46e5) !important;
        color: #ffffff !important;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3) !important;
    }

    .fc-button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    /* Today button */
    .fc-today-button {
        border: 1px solid #e2e8f0 !important;
        border-radius: 12px !important;
        margin-right: 12px !important;
        font-weight: 600 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
    }

    .fc-today-button:hover:not(:disabled) {
        border-color: #6366f1 !important;
    }

    /* Filter button */
    .fc-filter-button {
        border: 1px solid #e2e8f0 !important;
        border-radius: 12px !important;
        margin-left: 12px !important;
        font-weight: 600 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
        background: #ffffff !important;
        color: #475569 !important;
        transition: all 0.2s ease !important;
    }

    .fc-filter-button:hover {
        background: #f8fafc !important;
        border-color: #6366f1 !important;
        color: #1e293b !important;
        box-shadow: 0 2px 6px rgba(99, 102, 241, 0.15) !important;
        color: #6366f1 !important;
    }

    /* Navigation buttons */
    .fc-prev-button,
    .fc-next-button {
        border: 1px solid #e2e8f0 !important;
        border-radius: 12px !important;
        margin: 0 4px !important;
        padding: 10px 14px !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
    }

    .fc-prev-button:hover,
    .fc-next-button:hover {
        border-color: #6366f1 !important;
        color: #6366f1 !important;
    }

    /* ===================== GRID ===================== */
    .fc-scrollgrid {
        border: none !important;
        border-radius: 0;
    }

    .fc-scrollgrid td:first-of-type,
    .fc-scrollgrid th:first-of-type {
        border-left: none !important;
    }

    .fc-scrollgrid td:last-of-type,
    .fc-scrollgrid th:last-of-type {
        border-right: none !important;
    }

    .fc-col-header {
        background: rgba(255, 255, 255, 0.7);
    }

    .fc-col-header-cell {
        padding: 14px 8px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 1.2px;
        border-color: rgba(0, 0, 0, 0.05) !important;
    }

    .fc-daygrid-day {
        border-color: rgba(0, 0, 0, 0.05) !important;
        transition: background 0.15s ease;
    }

    .fc-timegrid-slot {
        border-color: rgba(0, 0, 0, 0.04) !important;
    }

    /* Weekend subtle tint */
    .fc-day-sat,
    .fc-day-sun {
        background-color: rgba(241, 245, 249, 0.5);
    }

    /* Today highlighting — soft indigo glow */
    .fc-day-today {
        background-color: rgba(99, 102, 241, 0.04) !important;
    }

    .fc-day-today .fc-daygrid-day-number {
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: #ffffff;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
        font-size: 14px;
    }

    /* Day numbers */
    .fc-daygrid-day-number {
        padding: 10px;
        color: #334155;
        font-size: 14px;
        font-weight: 500;
    }

    .fc-daygrid-day-top {
        padding: 4px 4px 0;
    }

    /* ===================== EVENTS — premium tiles ===================== */
    .fc-event {
        border-radius: 10px !important;
        border: none !important;
        padding: 6px 10px;
        margin: 3px 4px;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .fc-event:hover {
        transform: translateY(-2px) scale(1.01);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        z-index: 10;
    }

    .fc-event-title {
        font-weight: 600;
        font-size: 13px;
        line-height: 1.4;
    }

    .fc-event-time {
        font-weight: 500;
        font-size: 11px;
        opacity: 0.85;
    }

    .fc-daygrid-event {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Block events in month — larger tiles */
    .fc-daygrid-block-event .fc-event-main {
        padding: 2px 2px;
    }

    /* All-day events row padding */
    .fc-daygrid-day-events {
        padding: 0 2px 4px;
    }

    /* Abandoned/Cancelled appointments — red with strike-through and 30% opacity */
    .fc-event-abandoned {
        opacity: 0.3;
        background-color: #ef4444 !important; /* Red color */
    }

    .fc-event-abandoned .fc-event-title,
    .fc-event-abandoned .fc-event-time {
        text-decoration: line-through;
    }

    /* ===================== TIME GRID ===================== */
    .fc-timegrid-slot {
        height: 52px;
    }

    .fc-timegrid-slot-label {
        color: #94a3b8;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.3px;
    }

    /* Vertical events — bigger padding */
    .fc-timegrid-event {
        border-radius: 10px !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    .fc-timegrid-event .fc-event-main {
        padding: 6px 10px;
    }

    /* Current time indicator — indigo line */
    .fc-timegrid-now-indicator-line {
        border-color: #6366f1;
        border-width: 2px;
        box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
    }

    .fc-timegrid-now-indicator-arrow {
        border-color: #6366f1;
    }

    /* ===================== MORE LINK ===================== */
    .fc-daygrid-more-link {
        color: #6366f1;
        font-weight: 700;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 8px;
        transition: background 0.15s ease;
    }

    .fc-daygrid-more-link:hover {
        background: rgba(99, 102, 241, 0.08);
    }

    /* Selection highlighting */
    .fc-highlight {
        background: rgba(99, 102, 241, 0.06);
        border-radius: 10px;
    }

    /* Loading state */
    .fc-loading {
        opacity: 0.6;
        pointer-events: none;
    }

    /* ===================== RESPONSIVE ===================== */
    @media (max-width: 1024px) {
        .fc-header-toolbar {
            padding: 16px 20px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .fc-toolbar-title {
            font-size: 20px;
        }

        .fc-button {
            padding: 8px 14px !important;
            font-size: 12px !important;
        }

        .fc-event {
            padding: 4px 8px;
            margin: 2px 3px;
        }

        .fc-event-title {
            font-size: 12px;
        }

        .fc-timegrid-slot {
            height: 48px;
        }
    }

    @media (max-width: 768px) {
        .fc-header-toolbar {
            display: none !important;
        }

        .fc-col-header-cell {
            padding: 10px 4px;
            font-size: 10px;
            letter-spacing: 0.5px;
        }

        .fc-daygrid-day-number {
            padding: 6px;
            font-size: 13px;
        }

        .fc-day-today .fc-daygrid-day-number {
            width: 28px;
            height: 28px;
        }

        .fc-event {
            border-radius: 8px !important;
            padding: 3px 6px;
            margin: 2px;
        }

        .fc-event-title {
            font-size: 11px;
        }

        .fc-event-time {
            font-size: 10px;
        }

        .fc-timegrid-slot {
            height: 44px;
        }

        .fc-timegrid-slot-label {
            font-size: 10px;
        }
    }

    @media (max-width: 480px) {
        .fc-col-header-cell {
            padding: 8px 2px;
            font-size: 9px;
        }

        .fc-daygrid-day-number {
            padding: 4px;
            font-size: 12px;
        }

        .fc-day-today .fc-daygrid-day-number {
            width: 24px;
            height: 24px;
            font-size: 12px;
        }

        .fc-event {
            padding: 2px 5px;
            margin: 1px 2px;
            border-radius: 6px !important;
        }

        .fc-event-title {
            font-size: 10px;
        }

        .fc-event-time {
            font-size: 9px;
        }

        .fc-timegrid-slot {
            height: 40px;
        }

        .fc-daygrid-more-link {
            font-size: 10px;
            padding: 2px 4px;
        }
    }
`;

const CalendarWrapper = styled.div`
    position: relative;
    flex: 1;
    overflow: hidden;
`;

const LoadingOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const LoadingSpinner = styled.div`
    width: 44px;
    height: 44px;
    border: 3px solid #e2e8f0;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

/* ===================== MOBILE HEADER ===================== */
const MobileHeader = styled.div`
    display: none;

    @media (max-width: 768px) {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px 16px 12px;
        background: #ffffff;
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
    }
`;

const MobileViewSwitcher = styled.div`
    display: flex;
    background: #f1f5f9;
    border-radius: 12px;
    padding: 3px;
    gap: 2px;
`;

const MobileViewTab = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 8px 0;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    background: ${p => p.$active ? '#0f172a' : 'transparent'};
    color: ${p => p.$active ? '#ffffff' : '#64748b'};
    box-shadow: ${p => p.$active ? '0 2px 8px rgba(0,0,0,0.18)' : 'none'};

    &:active {
        opacity: 0.85;
    }
`;

const MobileNav = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const MobileNavBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
    color: #0f172a;
    cursor: pointer;
    transition: background 0.15s ease;

    &:active { background: #f1f5f9; }

    svg { width: 16px; height: 16px; }
`;

const MobileNavTitle = styled.div`
    flex: 1;
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.2px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 8px 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MobileActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const MobileFilterPill = styled.button<{ $active: boolean }>`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 14px;
    background: ${p => p.$active ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#ffffff'};
    color: ${p => p.$active ? '#ffffff' : '#475569'};
    border: 1px solid ${p => p.$active ? 'transparent' : '#e2e8f0'};
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;

    svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

const MobileFilterBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: rgba(255, 255, 255, 0.28);
    border-radius: 9px;
    font-size: 11px;
    font-weight: 700;
`;

const MobileAddBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border: none;
    border-radius: 12px;
    background: #0f172a;
    color: #ffffff;
    font-size: 24px;
    font-weight: 300;
    line-height: 1;
    cursor: pointer;
    transition: background 0.15s ease;

    &:active { background: #1e293b; }
`;

interface CalendarViewProps {
    onViewChange?: (view: CalendarViewType) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onViewChange }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccess } = useToast();
    const calendarRef = useRef<FullCalendar>(null);
    const quickEventModalRef = useRef<QuickEventModalRef>(null);
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [quickModalOpen, setQuickModalOpen] = useState(false);
    const [selectedEventData, setSelectedEventData] = useState<EventCreationData | null>(null);

    // Filter state - persisted in localStorage
    const {
        appointmentStatuses: selectedAppointmentStatuses,
        visitStatuses: selectedVisitStatuses,
        setAppointmentStatuses: setSelectedAppointmentStatuses,
        setVisitStatuses: setSelectedVisitStatuses,
    } = useCalendarFilters();
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [calendarTitle, setCalendarTitle] = useState('');
    const [currentView, setCurrentView] = useState<CalendarViewType>('dayGridMonth');

    const deselectedCount =
        (3 - selectedAppointmentStatuses.length) +
        (5 - selectedVisitStatuses.length);

    // Badge on the FullCalendar "Filtruj" button (desktop) – updated whenever filters change
    useEffect(() => {
        const btn = document.querySelector('.fc-filter-button');
        if (!btn) return;

        btn.querySelector('.fc-filter-badge')?.remove();

        if (deselectedCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'fc-filter-badge';
            badge.style.cssText =
                'display:inline-flex;align-items:center;justify-content:center;' +
                'min-width:18px;height:18px;padding:0 5px;margin-left:6px;' +
                'background:rgba(255,255,255,0.85);border-radius:9px;' +
                'font-size:11px;font-weight:700;color:#4f46e5;';
            badge.textContent = String(deselectedCount);
            btn.appendChild(badge);
        }
    }, [deselectedCount]);

    const handleMobileViewChange = useCallback((view: CalendarViewType) => {
        calendarRef.current?.getApi().changeView(view);
    }, []);

    const handleMobileAddClick = useCallback(() => {
        const now = new Date();
        setSelectedEventData({ start: now, end: now, allDay: true });
        setQuickModalOpen(true);
    }, []);

    // Popover state
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [popoverEvent, setPopoverEvent] = useState<AppointmentEventData | VisitEventData | null>(null);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });

    // Reservation options modal state

    const { createQuickEventAsync } = useQuickEventCreation();
    const { data: events = [], isLoading } = useCalendarEvents(dateRange, selectedAppointmentStatuses, selectedVisitStatuses);

    /**
     * Handle date range changes (triggered when view changes or user navigates)
     */
    const handleDatesSet = useCallback((arg: DatesSetArg) => {
        setDateRange({
            start: arg.startStr,
            end: arg.endStr,
        });

        setCalendarTitle(arg.view.title);
        setCurrentView(arg.view.type as CalendarViewType);

        // Notify parent of view change
        if (onViewChange) {
            onViewChange(arg.view.type as CalendarViewType);
        }
    }, [onViewChange]);

    /**
     * Handle date selection (click or drag) - Open quick modal
     */
    const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
        setSelectedEventData({
            start: selectInfo.start,
            end: selectInfo.end,
            allDay: selectInfo.allDay,
        });
        setQuickModalOpen(true);

        // Clear selection
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.unselect();
        }
    }, []);

    /**
     * Handle event click - Show popover with event summary
     */
    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const eventData = clickInfo.event.extendedProps as AppointmentEventData | VisitEventData;

        // Calculate popover position near the clicked event
        const rect = clickInfo.el.getBoundingClientRect();
        const popoverWidth = 380;
        const popoverMaxHeight = 600; // Estimated max height
        const margin = 16; // Margin from screen edges

        // Try to position to the right of the event
        let x = rect.right + 10;
        let y = rect.top;

        // Adjust X if popover would go off the right edge
        if (x + popoverWidth + margin > window.innerWidth) {
            // Try positioning to the left
            x = rect.left - popoverWidth - 10;

            // If still off screen (left edge), center it on screen
            if (x < margin) {
                x = Math.max(margin, (window.innerWidth - popoverWidth) / 2);
            }
        }

        // Adjust Y if popover would go off the bottom edge
        if (y + popoverMaxHeight + margin > window.innerHeight) {
            // Position from bottom, aligned with bottom of screen
            y = Math.max(margin, window.innerHeight - popoverMaxHeight - margin);
        }

        // Ensure popover doesn't go above the top edge
        if (y < margin) {
            y = margin;
        }

        setPopoverEvent(eventData);
        setPopoverPosition({ x, y });
        setPopoverOpen(true);
    }, []);

    /**
     * Handle quick event save
     */
    const handleQuickSave = useCallback(async (data: QuickEventFormData) => {
        await createQuickEventAsync(data);
        // Clear form after successful save
        quickEventModalRef.current?.clearForm();
        setQuickModalOpen(false);
        setSelectedEventData(null);
    }, [createQuickEventAsync]);

    /**
     * Handle modal close
     */
    const handleModalClose = useCallback(() => {
        setQuickModalOpen(false);
        setSelectedEventData(null);
    }, []);

    /**
     * Handle popover close
     */
    const handlePopoverClose = useCallback(() => {
        setPopoverOpen(false);
        setPopoverEvent(null);
    }, []);

    /**
     * Handle manage button click from popover (visits only)
     */
    const handleManageClick = useCallback(() => {
        if (!popoverEvent) return;
        if (popoverEvent.type === 'VISIT') {
            navigate(`/visits/${popoverEvent.id}`);
            setPopoverOpen(false);
        }
    }, [popoverEvent, navigate]);

    /**
     * Handle edit reservation from popover actions
     */
    const handleEditReservationClick = useCallback(() => {
        if (!popoverEvent || popoverEvent.type !== 'APPOINTMENT') return;
        navigate(`/appointments/${popoverEvent.id}/edit`);
        setPopoverOpen(false);
    }, [popoverEvent, navigate]);

    /**
     * Handle start visit from popover actions
     */
    const handleStartVisitClick = useCallback(() => {
        if (!popoverEvent || popoverEvent.type !== 'APPOINTMENT') return;
        navigate(`/reservations/${popoverEvent.id}/checkin`);
        setPopoverOpen(false);
    }, [popoverEvent, navigate]);

    /**
     * Handle cancel reservation from popover actions
     */
    const handleCancelReservationClick = useCallback(async () => {
        if (!popoverEvent || popoverEvent.type !== 'APPOINTMENT') return;

        try {
            await operationApi.cancelReservation(popoverEvent.id);
            setPopoverOpen(false);
            showSuccess('Rezerwacja porzucona', 'Rezerwacja została oznaczona jako porzucona.');
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        } catch (error) {
            console.error('Failed to cancel reservation:', error);
        }
    }, [popoverEvent, showSuccess, queryClient]);

    return (
        <CalendarContainer>
            {isLoading && (
                <LoadingOverlay>
                    <LoadingSpinner />
                </LoadingOverlay>
            )}

            <MobileHeader>
                {/* Row 1 – view switcher */}
                <MobileViewSwitcher>
                    {([
                        { view: 'timeGridDay',  label: 'Dzień'   },
                        { view: 'dayGridMonth', label: 'Miesiąc' },
                        { view: 'timeGridWeek', label: 'Tydzień' },
                    ] as { view: CalendarViewType; label: string }[]).map(({ view, label }) => (
                        <MobileViewTab
                            key={view}
                            $active={currentView === view}
                            onClick={() => handleMobileViewChange(view)}
                        >
                            {label}
                        </MobileViewTab>
                    ))}
                </MobileViewSwitcher>

                {/* Row 2 – navigation */}
                <MobileNav>
                    <MobileNavBtn onClick={() => calendarRef.current?.getApi().prev()} aria-label="Poprzedni">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </MobileNavBtn>
                    <MobileNavTitle>{calendarTitle}</MobileNavTitle>
                    <MobileNavBtn onClick={() => calendarRef.current?.getApi().next()} aria-label="Następny">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </MobileNavBtn>
                </MobileNav>

                {/* Row 3 – filter + add */}
                <MobileActions>
                    <MobileFilterPill
                        $active={deselectedCount > 0}
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                        </svg>
                        Filtruj
                        {deselectedCount > 0 && (
                            <MobileFilterBadge>{deselectedCount}</MobileFilterBadge>
                        )}
                    </MobileFilterPill>
                    <MobileAddBtn onClick={handleMobileAddClick} aria-label="Dodaj zdarzenie">
                        +
                    </MobileAddBtn>
                </MobileActions>
            </MobileHeader>

            <CalendarWrapper>
                <CalendarFilterDropdown
                    selectedAppointmentStatuses={selectedAppointmentStatuses}
                    selectedVisitStatuses={selectedVisitStatuses}
                    onAppointmentStatusesChange={setSelectedAppointmentStatuses}
                    onVisitStatusesChange={setSelectedVisitStatuses}
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                />

                <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}

                // Initial view
                initialView="dayGridMonth"

                // Custom buttons
                customButtons={{
                    filter: {
                        text: '🔍 Filtruj',
                        click: () => setIsFilterOpen(!isFilterOpen),
                    },
                }}

                // Header configuration
                headerToolbar={{
                    left: 'prev,next today filter',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}

                // View options
                views={{
                    dayGridMonth: {
                        titleFormat: { year: 'numeric', month: 'long' },
                        // Force block display for all events (not dot style)
                        dayMaxEventRows: false,
                    },
                    timeGridWeek: {
                        titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                    },
                    timeGridDay: {
                        titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                    },
                }}

                // Force all events to display as blocks (not dots)
                eventDisplay="block"

                // Time configuration
                slotMinTime="06:00:00"
                slotMaxTime="20:00:00"
                slotDuration="00:30:00"
                slotLabelInterval="01:00:00"

                // Behavior
                editable={false}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={3}
                weekends={true}
                nowIndicator={true}

                // Locale
                locale="pl"
                firstDay={1}

                // Event handling
                select={handleDateSelect}
                eventClick={handleEventClick}
                datesSet={handleDatesSet}

                // Events data
                events={events}

                // Button text
                buttonText={{
                    today: 'Dzisiaj',
                    month: 'Miesiąc',
                    week: 'Tydzień',
                    day: 'Dzień',
                }}

                // Other options
                height="100%"
                expandRows={true}
            />
            </CalendarWrapper>

            <QuickEventModal
                ref={quickEventModalRef}
                isOpen={quickModalOpen}
                eventData={selectedEventData}
                onClose={handleModalClose}
                onSave={handleQuickSave}
            />

            {popoverOpen && popoverEvent && (
                <EventSummaryPopover
                    event={popoverEvent}
                    position={popoverPosition}
                    onClose={handlePopoverClose}
                    onManageClick={handleManageClick}
                    onEditReservationClick={handleEditReservationClick}
                    onStartVisitClick={handleStartVisitClick}
                    onCancelReservationClick={handleCancelReservationClick}
                />
            )}
        </CalendarContainer>
    );
};
