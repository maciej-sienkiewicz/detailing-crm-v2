// src/common/hooks/useAuditLog.ts

import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/auditApi';

export const auditLogQueryKey = (module: string, entityId: string, page: number) =>
    ['audit', module, entityId, page] as const;

export const useAuditLog = (module: string, entityId: string, page = 1, size = 50) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: auditLogQueryKey(module, entityId, page),
        queryFn: () => auditApi.getAuditLog(module, entityId, page, size),
        enabled: !!module && !!entityId,
        staleTime: 30_000,
    });

    return {
        items: data?.items ?? [],
        pagination: data?.pagination,
        isLoading,
        isError,
        refetch,
    };
};
