// src/modules/operations/hooks/useOperationFilters.ts

import { useState, useCallback } from 'react';
import type { OperationType, OperationStatus } from '../types';

export const useOperationFilters = () => {
    const [selectedType, setSelectedType] = useState<OperationType | undefined>(undefined);
    const [selectedStatus, setSelectedStatus] = useState<OperationStatus | undefined>(undefined);

    const handleTypeChange = useCallback((type: OperationType | undefined) => {
        setSelectedType(type);
    }, []);

    const handleStatusChange = useCallback((status: OperationStatus | undefined) => {
        setSelectedStatus(status);
    }, []);

    const clearFilters = useCallback(() => {
        setSelectedType(undefined);
        setSelectedStatus(undefined);
    }, []);

    return {
        selectedType,
        selectedStatus,
        handleTypeChange,
        handleStatusChange,
        clearFilters,
    };
};