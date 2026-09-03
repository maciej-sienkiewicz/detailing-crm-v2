// src/modules/settings/api/attendanceApi.ts
//
// Lista obecności — arkusz PDF na wskazany miesiąc dla zaznaczonych pracowników.

import { apiClient } from '@/core/apiClient';

const BASE = '/v1/worktime/team';

export const attendanceApi = {
    /**
     * Zwraca gotowy PDF jako Blob.
     *
     * `skipErrorToast`: backend odpowiada błędem walidacji, gdy żaden z zaznaczonych
     * pracowników nie ma modułu Czasu pracy — komunikat pokazuje modal, przy którym
     * użytkownik stoi, a nie globalny dymek nad całą aplikacją.
     */
    generateAttendanceSheet: async (period: string, employeeIds: string[]): Promise<Blob> => {
        const response = await apiClient.post(
            `${BASE}/attendance-sheet`,
            { period, employeeIds },
            { responseType: 'blob', skipErrorToast: true },
        );
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
