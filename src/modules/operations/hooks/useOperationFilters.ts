// src/modules/operations/hooks/useOperationFilters.ts

import { useState, useCallback } from 'react';
import type { FilterStatus, OperationType, OperationStatus } from '../types';

export const useOperationFilters = () => {
    const [selectedFilter, setSelectedFilter] = useState<FilterStatus | undefined>(undefined);

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

        return { type: undefined, status: selectedFilter as OperationStatus };
    }, [selectedFilter]);

    return {
        selectedFilter,
        handleFilterChange,
        clearFilters,
        getApiFilters,
    };
};