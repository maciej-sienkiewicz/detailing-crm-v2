// src/modules/visits/api/serviceChecksApi.ts
//
// Lista kontrolna usług wizyty (ustawienie studia, domyślnie wyłączone): kto i kiedy
// odhaczył usługę jako zrobioną. Tylko znak dla ludzi na hali, nic od niego nie zależy.

import { apiClient } from '@/core';

export interface ServiceCheck {
    serviceItemId: string;
    checkedAt: string;
    checkedByName: string | null;
}

export const serviceChecksApi = {
    list: async (visitId: string): Promise<ServiceCheck[]> => {
        const response = await apiClient.get<{ checks: ServiceCheck[] }>(`/visits/${visitId}/service-checks`);
        return response.data.checks;
    },

    set: async (visitId: string, serviceItemId: string, done: boolean): Promise<ServiceCheck | null> => {
        const response = await apiClient.put<{ check: ServiceCheck | null }>(
            `/visits/${visitId}/service-checks/${serviceItemId}`,
            { done },
            { skipErrorToast: true },
        );
        return response.data.check;
    },
};
