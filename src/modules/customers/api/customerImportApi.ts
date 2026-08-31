import { apiClient } from '@/core';
import type {
    ImportCommitResult,
    ImportHandoffSession,
    ImportPreview,
} from '../types';

const BASE_PATH = '/v1/customers/import';

/**
 * Import kontaktów do kartoteki klientów.
 *
 * Dwa wejścia (telefon przez kod QR, plik `.vcf` z komputera) i jedno wyjście: sesja,
 * którą się przegląda i zatwierdza. Kontakty nigdy nie trafiają do bazy klientów wprost
 * z urządzenia — zawsze przechodzą przez podgląd, w którym człowiek widzi duplikaty
 * i decyduje, co zapisać.
 */
export const customerImportApi = {

    /** Zakłada sesję dla telefonu i zwraca sekret, który zaszywamy w kodzie QR. */
    openHandoffSession: async (): Promise<ImportHandoffSession> => {
        const response = await apiClient.post(`${BASE_PATH}/sessions`);
        return response.data;
    },

    /** Wgranie pliku `.vcf` — od razu zwraca gotowy podgląd. */
    uploadVCard: async (file: File): Promise<ImportPreview> => {
        const form = new FormData();
        form.append('file', file);
        const response = await apiClient.post(`${BASE_PATH}/sessions/vcard`, form);
        return response.data;
    },

    /**
     * Stan sesji z podglądem. Tym samym zapytaniem panel czeka na kontakty z telefonu
     * i odbiera gotową listę, gdy już przyjdą.
     */
    getSession: async (sessionId: string): Promise<ImportPreview> => {
        const response = await apiClient.get(`${BASE_PATH}/sessions/${sessionId}`);
        return response.data;
    },

    /** Zapisuje zaznaczone wiersze jako klientów. */
    commit: async (sessionId: string, selectedIndexes: number[]): Promise<ImportCommitResult> => {
        const response = await apiClient.post(`${BASE_PATH}/sessions/${sessionId}/commit`, {
            selectedIndexes,
        });
        return response.data;
    },
};

// ─── Strona telefonu (publiczna, uwierzytelniona tokenem z kodu QR) ───────────

export interface MobileImportContext {
    studioName: string;
    expiresAt: string;
}

/** Kontakt w kształcie, w jakim oddaje go przeglądarkowe API wyboru kontaktów. */
export interface PickedContact {
    name: string[];
    tel: string[];
    email: string[];
}

export const mobileContactImportApi = {

    /** Czy kod jest jeszcze ważny i do jakiego studia prowadzi. */
    getContext: async (handoffToken: string): Promise<MobileImportContext> => {
        const response = await apiClient.get(`/mobile/contacts/${handoffToken}`);
        return response.data;
    },

    submit: async (
        handoffToken: string,
        contacts: PickedContact[],
        deviceLabel?: string,
    ): Promise<{ received: number }> => {
        const response = await apiClient.post(`/mobile/contacts/${handoffToken}`, {
            contacts,
            deviceLabel,
        });
        return response.data;
    },
};
