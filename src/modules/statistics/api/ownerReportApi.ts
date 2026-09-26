// src/modules/statistics/api/ownerReportApi.ts
//
// Raport właściciela (PDF) i powiadomienie „Dostępny nowy raport".
// Backend: /api/v1/owner-report (OwnerReportController).
//
// Raport jest wyłącznie za PEŁNE okresy (tydzień od poniedziałku, 2 tygodnie,
// miesiąc kalendarzowy) - listę okresów do wyboru podaje backend, żeby front nie
// liczył wyrównania drugi raz.

import { apiClient } from '@/core/apiClient';

const BASE = '/v1/owner-report';

export type ReportLength = 'WEEK' | 'TWO_WEEKS' | 'MONTH';
export type ReportComparison = 'PREVIOUS' | 'MEDIAN';
export type ReportFrequency = 'OFF' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface ReportPeriod {
    from: string; // yyyy-MM-dd
    to: string;   // yyyy-MM-dd
    label: string; // „14.09–20.09.2026"
}

export const ownerReportApi = {
    listPeriods: async (length: ReportLength): Promise<ReportPeriod[]> => {
        const response = await apiClient.get<ReportPeriod[]>(`${BASE}/periods`, { params: { length } });
        return response.data;
    },

    downloadPdf: async (length: ReportLength, from: string, compare: ReportComparison): Promise<Blob> => {
        const response = await apiClient.get(`${BASE}/pdf`, {
            params: { length, from, compare },
            responseType: 'blob',
            // Błąd pokazujemy w oknie raportu, a nie drugi raz w toaście.
            skipErrorToast: true,
            // Porównanie z medianą liczy sześć poprzednich okresów - to chwilę trwa.
            timeout: 120_000,
        });
        return response.data as Blob;
    },

    getNotification: async (): Promise<ReportFrequency> => {
        const response = await apiClient.get<{ frequency: ReportFrequency }>(`${BASE}/notification`);
        return response.data.frequency;
    },

    updateNotification: async (frequency: ReportFrequency): Promise<ReportFrequency> => {
        const response = await apiClient.put<{ frequency: ReportFrequency }>(`${BASE}/notification`, { frequency });
        return response.data.frequency;
    },
};

export function reportFileName(length: ReportLength, period: ReportPeriod): string {
    const kind = length === 'WEEK' ? 'tydzien' : length === 'TWO_WEEKS' ? '2-tygodnie' : 'miesiac';
    return `raport-${kind}-${period.from}-${period.to}.pdf`;
}
