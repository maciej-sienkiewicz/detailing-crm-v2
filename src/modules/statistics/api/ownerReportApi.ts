// src/modules/statistics/api/ownerReportApi.ts
//
// Raport właściciela (PDF): pobranie za okres i ustawienie wysyłki mailem.
// Backend: /api/v1/owner-report (OwnerReportController).

import { apiClient } from '@/core/apiClient';

const BASE = '/v1/owner-report';

export type ReportFrequency = 'OFF' | 'WEEKLY' | 'BIWEEKLY';

export interface OwnerReportSettings {
    frequency: ReportFrequency;
}

export const ownerReportApi = {
    /** Daty w formacie ISO (yyyy-MM-dd), obie włącznie. */
    downloadPdf: async (from: string, to: string): Promise<Blob> => {
        const response = await apiClient.get(`${BASE}/pdf`, {
            params: { from, to },
            responseType: 'blob',
            // Błąd pokazujemy pod przyciskiem, a nie drugi raz w toaście.
            skipErrorToast: true,
            timeout: 60_000,
        });
        return response.data as Blob;
    },

    getSettings: async (): Promise<OwnerReportSettings> => {
        const response = await apiClient.get<OwnerReportSettings>(`${BASE}/settings`);
        return response.data;
    },

    updateSettings: async (frequency: ReportFrequency): Promise<OwnerReportSettings> => {
        const response = await apiClient.put<OwnerReportSettings>(`${BASE}/settings`, { frequency });
        return response.data;
    },
};
