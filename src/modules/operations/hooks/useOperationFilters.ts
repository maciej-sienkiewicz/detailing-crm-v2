// src/modules/operations/hooks/useOperationFilters.ts

import { useState, useCallback } from 'react';
import type { FilterStatus, OperationType, VisitStatus } from '../types';

export const useOperationFilters = () => {
    // Set default filter to 'RESERVATIONS' to show appointments in CREATED and ABANDONED status
    const [selectedFilter, setSelectedFilter] = useState<FilterStatus | undefined>('RESERVATIONS');

    const handleFilterChange = useCallback((filter: FilterStatus | undefined) => {
        setSelectedFilter(filter);
    }, []);

    const clearFilters = useCallback(() => {
        setSelectedFilter(undefined);
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
        handleFilterChange,
        clearFilters,
        getApiFilters,
    };
};