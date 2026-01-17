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

        const isAllDay = eventData.allDay;
        let startDateTime: string;
        let endDateTime: string;

        if (isAllDay) {
            // For all-day events, use date format (YYYY-MM-DD)
            startDateTime = formatDate(eventData.start);

            // Calculate days difference
            const timeDiff = eventData.end.getTime() - eventData.start.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysDiff > 1) {
                // Multi-day selection - set end date
                const endDate = new Date(eventData.end);
                endDate.setDate(endDate.getDate() - 1); // FullCalendar's end is exclusive
                endDateTime = `${formatDate(endDate)}T23:59:59`;
            } else {
                // Single day - leave end date empty or same as start
                endDateTime = `${startDateTime}T23:59:59`;
            }
        } else {
            // For timed events, use datetime-local format (YYYY-MM-DDTHH:mm)
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
