// src/modules/operations/hooks/useOperationFilters.ts

import { useState, useCallback } from 'react';
import type { FilterStatus, OperationType, VisitStatus } from '../types';

export const useOperationFilters = () => {
    // Set default filter to 'IN_PROGRESS' to show visits in progress
    const [selectedFilter, setSelectedFilter] = useState<FilterStatus | undefined>('IN_PROGRESS');
    const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

    const handleFilterChange = useCallback((filter: FilterStatus | undefined) => {
        setSelectedFilter(filter);
    }, []);

    const handleDateChange = useCallback((date: string | undefined) => {
        setSelectedDate(date);
    }, []);

    const clearFilters = useCallback(() => {
        setSelectedFilter(undefined);
        setSelectedDate(undefined);
    }, []);

    const getApiFilters = useCallback(() => {
        if (!selectedFilter) {
            return { type: undefined, status: undefined };
        }

        if (selectedFilter === 'RESERVATIONS') {
            return { type: 'RESERVATION' as OperationType, status: undefined };
        }

        return { type: 'VISIT' as OperationType, status: selectedFilter as VisitStatus };
    }, [selectedFilter]);

    return {
        selectedFilter,
        selectedDate,
        handleFilterChange,
        handleDateChange,
        clearFilters,
        getApiFilters,
    };
};