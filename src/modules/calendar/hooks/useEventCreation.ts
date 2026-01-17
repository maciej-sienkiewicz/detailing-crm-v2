// src/modules/calendar/hooks/useEventCreation.ts

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EventCreationData } from '../types';

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

        // Format dates for URL params
        const startDateTime = eventData.start.toISOString();
        const endDateTime = eventData.end.toISOString();
        const isAllDay = eventData.allDay;

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
