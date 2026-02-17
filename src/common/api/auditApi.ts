// src/common/api/auditApi.ts

import { apiClient } from '@/core/apiClient';
import type { AuditLogResponse } from '../types/audit';

export const auditApi = {
    getAuditLog: async (
        module: string,
        entityId: string,
        page = 1,
        size = 50
    ): Promise<AuditLogResponse> => {
        const response = await apiClient.get<AuditLogResponse>(
            `/v1/audit/${module}/${entityId}`,
            { params: { page, size } }
        );
        return response.data;
    },
};
