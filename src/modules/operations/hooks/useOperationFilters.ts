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
            return { type: undefined, status: undefined, deleted: undefined };
        }

        if (selectedFilter === 'DELETED') {
            return { type: undefined, status: undefined, deleted: true };
        }

        if (selectedFilter === 'RESERVATIONS') {
            return { type: 'RESERVATION' as OperationType, status: undefined, deleted: undefined };
        }

        // REJECTED pokazuje zarówno odrzucone wizyty jak i porzucone rezerwacje (ABANDONED)
        if (selectedFilter === 'REJECTED') {
            return { type: undefined, status: 'REJECTED' as VisitStatus, deleted: undefined };
        }

        return { type: 'VISIT' as OperationType, status: selectedFilter as VisitStatus, deleted: undefined };
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