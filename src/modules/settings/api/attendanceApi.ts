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

/** Podpis na innym urządzeniu: tablet studia albo własny telefon (link SMS-em). */
export type RemoteSigningChannel = 'TABLET' | 'SMS';

export interface AttendanceSigningOptions {
    tablets: { tabletId: string; deviceName: string }[];
    /** Numer z konta zalogowanego, zamaskowany; null, gdy konto nie ma poprawnego numeru. */
    phone: string | null;
}

/** Stan prośby o podpis - ten sam co przy protokołach wizyt. */
export type RemoteSignatureStatus =
    | 'PENDING_DISPLAY'
    | 'DISPLAYED'
    | 'COMPLETED'
    | 'DECLINED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'FAILED';

export interface AttendanceSignatureRequest {
    id: string;
    attendanceSheetId: string | null;
    /** Tablet, na który poszła prośba; null = dowolny tablet studia (albo SMS). */
    tabletId: string | null;
    channel: 'TABLET' | 'SMS_LINK';
    status: RemoteSignatureStatus;
    expiresAt: string;
    failureReason: string | null;
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

    /** Czym można poprosić o podpis: sparowane tablety studia i własny numer (zamaskowany). */
    getSigningOptions: async (): Promise<AttendanceSigningOptions> => {
        const response = await apiClient.get<AttendanceSigningOptions>(`${BASE}/attendance-sheet/signing-options`);
        return response.data;
    },

    /**
     * „Wyświetl podpis na tablecie" / „Wyślij podpis na mój numer telefonu". Po podpisie
     * lista jest zatwierdzona. `skipErrorToast`: powód odmowy (brak numeru w profilu, brak
     * tabletu, brak kredytów SMS) pokazuje okno zatwierdzania, przy którym stoi użytkownik.
     */
    requestRemoteSignature: async (
        sheetId: string,
        channel: RemoteSigningChannel,
        tabletId?: string,
    ): Promise<AttendanceSignatureRequest> => {
        const response = await apiClient.post<AttendanceSignatureRequest>(
            `${BASE}/attendance-sheet/${sheetId}/signature-requests`,
            { channel, tabletId: tabletId ?? null },
            { skipErrorToast: true },
        );
        return response.data;
    },

    /** Najnowsza prośba o podpis tej listy (także zakończona); null, gdy nie było żadnej. */
    getLatestRemoteSignature: async (sheetId: string): Promise<AttendanceSignatureRequest | null> => {
        const response = await apiClient.get<AttendanceSignatureRequest>(
            `${BASE}/attendance-sheet/${sheetId}/signature-request`,
        );
        return response.status === 204 ? null : response.data;
    },

    cancelRemoteSignature: async (sheetId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/attendance-sheet/${sheetId}/signature-request`);
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

// Pomocnicze funkcje pobierania pliku mieszkają we wspólnym module - używa ich też raport
// w Statystykach. Eksport zostaje tu, żeby istniejące importy i atrapy w testach działały.
export { readBlobErrorMessage, saveBlobAsFile } from '@/common/utils/blobFile';
