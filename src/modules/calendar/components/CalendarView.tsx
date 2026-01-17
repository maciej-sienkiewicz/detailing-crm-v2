// src/modules/calendar/components/CalendarView.tsx

import React, { useState, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, DatesSetArg } from '@fullcalendar/core';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useEventCreation } from '../hooks/useEventCreation';
import { useQuickEventCreation } from '../hooks/useQuickEventCreation';
import { QuickEventModal, type QuickEventFormData, type QuickEventModalRef } from './QuickEventModal';
import type { DateRange, CalendarView as CalendarViewType, EventCreationData } from '../types';
import '../calendar.css';

const CalendarContainer = styled.div`
    height: 100%;
    width: 100%;
    background: #ffffff;

    /* FullCalendar base styles */
    .fc {
        font-family: 'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        height: 100%;
    }

    /* Calendar header */
    .fc-header-toolbar {
        padding: 16px 24px;
        margin-bottom: 0 !important;
        background: #ffffff;
        border-bottom: 1px solid #e5e7eb;
    }

    .fc-toolbar-title {
        font-size: 22px;
        font-weight: 400;
        color: #1f2937;
    }

    /* View buttons styling - Google Calendar style */
    .fc-button-group {
        border: 1px solid #dadce0;
        border-radius: 4px;
        overflow: hidden;
    }

    .fc-button {
        background: #ffffff !important;
        color: #3c4043 !important;
        border: none !important;
        font-weight: 500 !important;
        text-transform: none !important;
        padding: 8px 16px !important;
        box-shadow: none !important;
        transition: background-color 0.2s;
    }

    .fc-button:hover {
        background: #f8f9fa !important;
    }

    .fc-button-active {
        background: #e8f0fe !important;
        color: #1a73e8 !important;
    }

    .fc-button:disabled {
        opacity: 0.6;
    }

    /* Today button */
    .fc-today-button {
        border: 1px solid #dadce0 !important;
        border-radius: 4px !important;
        margin-right: 16px !important;
    }

    /* Navigation buttons */
    .fc-prev-button,
    .fc-next-button {
        border: 1px solid #dadce0 !important;
        border-radius: 4px !important;
        margin: 0 4px !important;
        padding: 8px 12px !important;
    }

    /* Calendar grid */
    .fc-scrollgrid {
        border-color: #e5e7eb !important;
    }

    .fc-col-header {
        background: #f8f9fa;
        border-color: #e5e7eb !important;
    }

    .fc-col-header-cell {
        padding: 12px 8px;
        font-weight: 500;
        color: #5f6368;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.8px;
    }

    .fc-daygrid-day,
    .fc-timegrid-slot {
        border-color: #e5e7eb !important;
    }

    /* Weekend styling */
    .fc-day-sat,
    .fc-day-sun {
        background-color: #f8f9fa;
    }

    /* Today highlighting */
    .fc-day-today {
        background-color: #e8f0fe !important;
    }

    .fc-day-today .fc-daygrid-day-number {
        background: #1a73e8;
        color: #ffffff;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 500;
    }

    /* Day numbers */
    .fc-daygrid-day-number {
        padding: 8px;
        color: #3c4043;
        font-size: 14px;
    }

    /* Events styling */
    .fc-event {
        border-radius: 4px;
        border: none !important;
        padding: 4px 8px;
        margin: 2px;
        cursor: pointer;
        transition: transform 0.1s, box-shadow 0.1s;
    }

    .fc-event:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .fc-event-title {
        font-weight: 500;
        font-size: 13px;
    }

    .fc-event-time {
        font-weight: 400;
        font-size: 12px;
    }

    /* Time grid specific */
    .fc-timegrid-slot {
        height: 48px;
    }

    .fc-timegrid-slot-label {
        color: #5f6368;
        font-size: 12px;
    }

    /* Current time indicator (red line) */
    .fc-timegrid-now-indicator-line {
        border-color: #ea4335;
        border-width: 2px;
    }

    .fc-timegrid-now-indicator-arrow {
        border-color: #ea4335;
    }

    /* Selection highlighting */
    .fc-highlight {
        background: rgba(26, 115, 232, 0.1);
    }

    /* More link */
    .fc-daygrid-more-link {
        color: #1a73e8;
        font-weight: 500;
    }

    /* Loading state */
    .fc-loading {
        opacity: 0.6;
        pointer-events: none;
    }
`;

const LoadingOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const LoadingSpinner = styled.div`
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: #1a73e8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

interface CalendarViewProps {
    onViewChange?: (view: CalendarViewType) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onViewChange }) => {
    const navigate = useNavigate();
    const calendarRef = useRef<FullCalendar>(null);
    const quickEventModalRef = useRef<QuickEventModalRef>(null);
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [quickModalOpen, setQuickModalOpen] = useState(false);
    const [selectedEventData, setSelectedEventData] = useState<EventCreationData | null>(null);

    const { createEvent } = useEventCreation();
    const { createQuickEvent } = useQuickEventCreation();
    const { data: events = [], isLoading } = useCalendarEvents(dateRange);

    // Fetch appointment colors for quick event creation
    const { data: appointmentColors } = useQuery({
        queryKey: ['appointment-colors'],
        queryFn: async () => {
            const response = await apiClient.get('/api/v1/appointment-colors');
            return response.data.colors || [];
        },
    });

    /**
     * Handle date range changes (triggered when view changes or user navigates)
     */
    const handleDatesSet = useCallback((arg: DatesSetArg) => {
        setDateRange({
            start: arg.startStr,
            end: arg.endStr,
        });

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
     * Handle event click
     */
    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const eventType = clickInfo.event.extendedProps.type;
        const eventId = clickInfo.event.id;

        if (eventType === 'APPOINTMENT') {
            navigate(`/appointments/${eventId}/edit`);
        } else if (eventType === 'VISIT') {
            navigate(`/visits/${eventId}`);
        }
    }, [navigate]);

    /**
     * Handle quick event save
     */
    const handleQuickSave = useCallback((data: QuickEventFormData) => {
        createQuickEvent(data, {
            onSuccess: () => {
                // Clear form after successful save
                quickEventModalRef.current?.clearForm();
                setQuickModalOpen(false);
                setSelectedEventData(null);
            }
        });
    }, [createQuickEvent]);

    /**
     * Handle modal close
     */
    const handleModalClose = useCallback(() => {
        setQuickModalOpen(false);
        setSelectedEventData(null);
    }, []);

    return (
        <CalendarContainer>
            {isLoading && (
                <LoadingOverlay>
                    <LoadingSpinner />
                </LoadingOverlay>
            )}

            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}

                // Initial view
                initialView="dayGridMonth"

                // Header configuration
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}

                // View options
                views={{
                    dayGridMonth: {
                        titleFormat: { year: 'numeric', month: 'long' },
                    },
                    timeGridWeek: {
                        titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                    },
                    timeGridDay: {
                        titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                    },
                }}

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

            <QuickEventModal
                ref={quickEventModalRef}
                isOpen={quickModalOpen}
                eventData={selectedEventData}
                onClose={handleModalClose}
                onSave={handleQuickSave}
            />
        </CalendarContainer>
    );
};
