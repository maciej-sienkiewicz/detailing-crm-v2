// src/modules/operations/hooks/useOperationFilters.ts

import { useState, useCallback } from 'react';
import type { FilterStatus, OperationType, VisitStatus, OperationAdvancedFilters } from '../types';

const EMPTY_ADVANCED: OperationAdvancedFilters = {};

export const useOperationFilters = () => {
    const [selectedFilter, setSelectedFilter] = useState<FilterStatus | undefined>('IN_PROGRESS');
    const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
    const [advancedFilters, setAdvancedFilters] = useState<OperationAdvancedFilters>(EMPTY_ADVANCED);

    const handleFilterChange = useCallback((filter: FilterStatus | undefined) => {
        setSelectedFilter(filter);
    }, []);

    const handleDateChange = useCallback((date: string | undefined) => {
        setSelectedDate(date);
    }, []);

    const clearFilters = useCallback(() => {
        setSelectedFilter(undefined);
        setSelectedDate(undefined);
        setAdvancedFilters(EMPTY_ADVANCED);
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

        if (selectedFilter === 'REJECTED') {
            return { type: undefined, status: 'REJECTED' as VisitStatus, deleted: undefined };
        }

        return { type: 'VISIT' as OperationType, status: selectedFilter as VisitStatus, deleted: undefined };
    }, [selectedFilter]);

    const activeAdvancedFilterCount = Object.entries(advancedFilters).reduce((count, [, value]) => {
        if (value === null || value === undefined || value === '') return count;
        if (Array.isArray(value) && value.length === 0) return count;
        return count + 1;
    }, 0);

    return {
        selectedFilter,
        selectedDate,
        advancedFilters,
        activeAdvancedFilterCount,
        handleFilterChange,
        handleDateChange,
        setAdvancedFilters,
        clearFilters,
        getApiFilters,
    };
};
