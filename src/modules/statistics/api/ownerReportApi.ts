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

/**
 * Wiersz tabeli raportów. Liczby są tymi z PDF-u za ten okres (wizyty wydane w okresie,
 * brutto co do grosza), a napis zmiany (`salesGrossChange`) liczy backend tą samą funkcją
 * co PDF - tabela i plik nie mogą się różnić o punkt procentowy.
 */
export interface ReportArchiveRow {
    from: string;
    to: string;
    label: string;
    /** Okres trwa: liczby „do dziś", bez porównania i bez PDF-u. */
    inProgress: boolean;
    /** Dzień, od którego raport za ten okres da się pobrać. */
    availableOn: string;
    closedVisits: number;
    salesGrossCents: number;
    baselineClosedVisits: number | null;
    baselineSalesGrossCents: number | null;
    closedVisitsChange: string | null;
    salesGrossChange: string | null;
}

export interface ReportArchive {
    length: ReportLength;
    comparison: ReportComparison;
    /** Dzień założenia konta - od niego zaczyna się tabela. */
    since: string;
    /** Od najnowszego; pierwszy wiersz to okres trwający. */
    rows: ReportArchiveRow[];
}

export const ownerReportApi = {
    getArchive: async (length: ReportLength, compare: ReportComparison): Promise<ReportArchive> => {
        const response = await apiClient.get<ReportArchive>(`${BASE}/archive`, { params: { length, compare } });
        return response.data;
    },

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
