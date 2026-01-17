// src/modules/calendar/hooks/useEventCreation.ts

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EventCreationData } from '../types';

/**
 * Format date for datetime-local input (YYYY-MM-DDTHH:mm)
 */
const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Format date for date input (YYYY-MM-DD)
 */
const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

/**
 * Hook to handle event creation from calendar interactions
 * (click, drag, select)
 */
export const useEventCreation = () => {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);

    /**
     * Handle event creation by navigating to appointment creation with pre-filled data
     */
    const createEvent = useCallback((eventData: EventCreationData) => {
        setIsCreating(true);

        // Calculate days difference to determine if it's a single or multi-day selection
        const timeDiff = eventData.end.getTime() - eventData.start.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // Only single-day selections should be all-day events
        // Multi-day selections should allow time selection
        const isAllDay = daysDiff === 1 && eventData.allDay;

        let startDateTime: string;
        let endDateTime: string;

        if (isAllDay) {
            // Single day all-day event - use date format (YYYY-MM-DD)
            startDateTime = formatDate(eventData.start);
            endDateTime = `${startDateTime}T23:59:59`;
        } else if (daysDiff > 1) {
            // Multi-day selection - use datetime-local format with time selection enabled
            // Set start to beginning of first day at 09:00
            const startDate = new Date(eventData.start);
            startDate.setHours(9, 0, 0, 0);
            startDateTime = formatDateTimeLocal(startDate);

            // Set end to last day at 23:59:59
            const endDate = new Date(eventData.end);
            endDate.setDate(endDate.getDate() - 1); // FullCalendar's end is exclusive
            endDateTime = `${formatDate(endDate)}T23:59:59`;
        } else {
            // Single time slot selection - use datetime-local format
            startDateTime = formatDateTimeLocal(eventData.start);
            endDateTime = `${formatDate(eventData.end)}T23:59:59`;
        }

        // Navigate to appointment creation with pre-filled schedule
        const params = new URLSearchParams({
            startDateTime,
            endDateTime,
            isAllDay: isAllDay.toString(),
        });

        navigate(`/appointments/create?${params.toString()}`);
    }, [navigate]);

    /**
     * Cancel event creation
     */
    const cancelCreation = useCallback(() => {
        setIsCreating(false);
    }, []);

    return {
        isCreating,
        createEvent,
        cancelCreation,
    };
};
