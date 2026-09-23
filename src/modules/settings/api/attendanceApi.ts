// src/modules/settings/api/attendanceApi.ts
//
// Lista obecności jako rozliczenie: wygeneruj → podejrzyj → zatwierdź (opcjonalnie
// z podpisem) albo usuń.
//
// Generowanie zwraca OPIS dokumentu, a nie plik: arkusz zostaje w systemie, w zakładce
// Rozliczenia, gdzie każdy administrator widzi, czy ktoś go już zatwierdził.

import { apiClient } from '@/core/apiClient';

const BASE = '/v1/worktime/team';

/** GENERATED - czeka na zatwierdzenie, APPROVED - sprawdzona, gotowa dla księgowości. */
export type AttendanceSheetStatus = 'GENERATED' | 'APPROVED';

export interface AttendanceSheet {
    id: string;
    /** Miesiąc rozliczenia, YYYY-MM. */
    period: string;
    employeeCount: number;
    signed: boolean;
    signerName: string | null;
    signedAt: number | null;
    createdAt: number;
    status: AttendanceSheetStatus;
    /** Kto wygenerował listę; null, gdy autora nie da się już ustalić. */
    createdByName: string | null;
    approvedAt: number | null;
    approvedByName: string | null;
}

export const attendanceApi = {
    /** Rozliczenia studia, od najnowszych. */
    listAttendanceSheets: async (limit = 100): Promise<AttendanceSheet[]> => {
        const response = await apiClient.get<AttendanceSheet[]>(`${BASE}/attendance-sheets`, {
            params: { limit },
        });
        return response.data;
    },

    /**
     * `skipErrorToast`: backend odpowiada błędem walidacji, gdy żaden z zaznaczonych
     * pracowników nie ma modułu Czasu pracy - komunikat pokazuje modal, przy którym
     * użytkownik stoi, a nie globalny dymek nad całą aplikacją.
     */
    generateAttendanceSheet: async (period: string, employeeIds: string[]): Promise<AttendanceSheet> => {
        const response = await apiClient.post<AttendanceSheet>(
            `${BASE}/attendance-sheet`,
            { period, employeeIds },
            { skipErrorToast: true },
        );
        return response.data;
    },

    /**
     * Zatwierdzenie, opcjonalnie z podpisem z kanwy (`data:image/png;base64,...`).
     * Kto zatwierdza, backend bierze z sesji. Konflikt (ktoś zatwierdził chwilę wcześniej)
     * pokazuje globalny dymek z nazwiskiem tej osoby.
     */
    approveAttendanceSheet: async (sheetId: string, signatureImage: string | null): Promise<AttendanceSheet> => {
        const response = await apiClient.post<AttendanceSheet>(
            `${BASE}/attendance-sheet/${sheetId}/approve`,
            { signatureImage },
        );
        return response.data;
    },

    deleteAttendanceSheet: async (sheetId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/attendance-sheet/${sheetId}`);
    },

    /** Plik arkusza - podpisany, jeśli podpis już złożono. */
    downloadAttendanceSheet: async (sheetId: string): Promise<Blob> => {
        const response = await apiClient.get(`${BASE}/attendance-sheet/${sheetId}/file`, {
            responseType: 'blob',
            skipErrorToast: true,
        });
        return response.data as Blob;
    },
};

/**
 * Błąd z żądania o `responseType: 'blob'` też przychodzi jako Blob, więc treść
 * komunikatu trzeba z niego odczytać - inaczej użytkownik dostaje „[object Blob]".
 */
export async function readBlobErrorMessage(error: unknown): Promise<string | null> {
    const data = (error as { response?: { data?: unknown } })?.response?.data;
    if (!(data instanceof Blob)) {
        return (data as { message?: string } | undefined)?.message ?? null;
    }
    try {
        const parsed = JSON.parse(await data.text()) as { message?: string };
        return parsed.message ?? null;
    } catch {
        return null;
    }
}

/** Zapisuje pobrany plik na dysk użytkownika. */
export function saveBlobAsFile(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
