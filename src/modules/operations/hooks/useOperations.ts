// src/modules/operations/hooks/useOperations.ts

import { useQuery } from '@tanstack/react-query';
import { operationApi } from '../api/operationApi';
import type { OperationFilters } from '../types';

export const operationsQueryKey = (filters: OperationFilters) => [
    'operations',
    filters.search,
    filters.page,
    filters.pageSize,
    filters.type,
    filters.status,
    filters.scheduledDate,
    filters.sortBy,
    filters.sortDirection,
    filters.deleted ?? false,
    filters.dateFrom,
    filters.dateTo,
    filters.minAmount,
    filters.maxAmount,
    filters.serviceCountMin,
    filters.serviceCountMax,
    filters.vehicleBrand,
    filters.vehicleModel,
    filters.serviceIds?.join(','),
];

export const useOperations = (filters: OperationFilters) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: operationsQueryKey(filters),
        queryFn: ({ signal }) => operationApi.getOperations(filters, signal),
    });

    return {
        operations: data?.items ?? [],
        pageMeta: data?.page,
        isLoading,
        isError,
        refetch,
    };
};