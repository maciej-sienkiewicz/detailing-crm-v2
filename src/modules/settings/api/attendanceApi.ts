// src/modules/settings/api/attendanceApi.ts
//
// Lista obecności: wygeneruj → (opcjonalnie) podpisz → pobierz.
//
// Generowanie zwraca OPIS dokumentu, a nie plik: arkusz jest zapisywany w systemie
// (podpisany dokument kadrowy musi dać się odszukać później), a użytkownik decyduje
// jeszcze, czy podpisać go przed pobraniem.

import { apiClient } from '@/core/apiClient';

const BASE = '/v1/worktime/team';

export interface AttendanceSheet {
    id: string;
    period: string;
    employeeCount: number;
    signed: boolean;
    signerName: string | null;
    signedAt: number | null;
    createdAt: number;
}

export const attendanceApi = {
    /**
     * `skipErrorToast`: backend odpowiada błędem walidacji, gdy żaden z zaznaczonych
     * pracowników nie ma modułu Czasu pracy — komunikat pokazuje modal, przy którym
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

    /** Podpis z kanwy jako `data:image/png;base64,...`; kto podpisuje, backend bierze z sesji. */
    signAttendanceSheet: async (sheetId: string, signatureImage: string): Promise<AttendanceSheet> => {
        const response = await apiClient.post<AttendanceSheet>(
            `${BASE}/attendance-sheet/${sheetId}/sign`,
            { signatureImage },
            { skipErrorToast: true },
        );
        return response.data;
    },

    /** Plik arkusza — podpisany, jeśli podpis już złożono. */
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
 * komunikatu trzeba z niego odczytać — inaczej użytkownik dostaje „[object Blob]".
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
