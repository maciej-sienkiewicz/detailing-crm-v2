// src/modules/operations/hooks/useOperations.ts

import { useQuery } from '@tanstack/react-query';
import { operationApi } from '../api/operationApi';
import type { OperationFilters } from '../types';

export const operationsQueryKey = (filters: OperationFilters) => [
    'operations',
    filters.search,
    filters.page,
    filters.limit,
    filters.type,
    filters.status,
    filters.scheduledDate,
    filters.sortBy,
    filters.sortDirection,
];

export const useOperations = (filters: OperationFilters) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: operationsQueryKey(filters),
        queryFn: () => operationApi.getOperations(filters),
    });

    return {
        operations: data?.data ?? [],
        pagination: data?.pagination,
        isLoading,
        isError,
        refetch,
    };
};