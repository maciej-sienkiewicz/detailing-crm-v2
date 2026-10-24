// src/modules/customers/api/customerEditApi.ts

import { putToPresignedUrl } from '@/common/utils/presignedUpload';
import { apiClient } from '@/core/apiClient';
import type {
    Customer,
    UpdateCustomerPayload,
    UpdateCompanyPayload,
    CustomerNote,
    CreateNotePayload,
    UpdateNotePayload,
    CustomerDocument,
    UploadDocumentPayload,
    CompanyDetails,
} from '../types';

const CUSTOMERS_BASE_PATH = '/v1/customers';

/**
 * Poza oknem wysyłki (12:00–18:00) backend nie wysyła SMS-a, tylko odkłada go do kolejki
 * i mówi kiedy wyjdzie. Front wyrzucał tę odpowiedź i wieczorem pokazywał „SMS wysłany",
 * choć klient dostawał wiadomość dopiero następnego dnia w południe.
 */
export interface SendCustomerSmsResult {
    queued: boolean;
    /** Termin wysyłki z kolejki (ISO, z `Z`); null, gdy SMS wyszedł od razu. */
    scheduledFor: string | null;
}

export const customerEditApi = {
    /**
     * SMS napisany ręcznie z karty klienta. Backend zwraca 400/402/502 z opisem,
     * gdy studio nie ma modułu, kredytów albo klient nie ma numeru - komunikat
     * pokazujemy wprost, bo użytkownik może na niego zareagować. Pokazuje go okno
     * (`skipErrorToast`): globalny toast powtarzał ten sam tekst drugi raz.
     */
    sendSms: async (customerId: string, message: string): Promise<SendCustomerSmsResult> => {
        const res = await apiClient.post<Partial<SendCustomerSmsResult>>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/sms`,
            { message },
            { skipErrorToast: true },
        );
        return { queued: res.data?.queued === true, scheduledFor: res.data?.scheduledFor ?? null };
    },

    updateCustomer: async (
        customerId: string,
        payload: UpdateCustomerPayload
    ): Promise<Customer> => {
        const response = await apiClient.patch<Customer>(
            `${CUSTOMERS_BASE_PATH}/${customerId}`,
            payload
        );
        return response.data;
    },

    updateCompany: async (
        customerId: string,
        payload: UpdateCompanyPayload
    ): Promise<CompanyDetails> => {
        const response = await apiClient.patch<CompanyDetails>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/company`,
            payload
        );
        return response.data;
    },

    deleteCompany: async (customerId: string): Promise<void> => {
        await apiClient.delete(`${CUSTOMERS_BASE_PATH}/${customerId}/company`);
    },

    getNotes: async (customerId: string): Promise<CustomerNote[]> => {
        const response = await apiClient.get<CustomerNote[]>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/notes`
        );
        return response.data;
    },

    createNote: async (customerId: string, payload: CreateNotePayload): Promise<CustomerNote> => {
        const response = await apiClient.post<CustomerNote>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/notes`,
            payload
        );
        return response.data;
    },

    updateNote: async (customerId: string, noteId: string, payload: UpdateNotePayload): Promise<CustomerNote> => {
        const response = await apiClient.patch<CustomerNote>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/notes/${noteId}`,
            payload
        );
        return response.data;
    },

    deleteNote: async (customerId: string, noteId: string): Promise<void> => {
        await apiClient.delete(`${CUSTOMERS_BASE_PATH}/${customerId}/notes/${noteId}`);
    },

    getDocuments: async (customerId: string): Promise<CustomerDocument[]> => {
        const response = await apiClient.get<CustomerDocument[]>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/documents`
        );
        return response.data;
    },

    uploadDocument: async (payload: UploadDocumentPayload): Promise<CustomerDocument> => {
        // Step 1: Initiate upload; backend returns presigned S3 URL
        const initiateResponse = await apiClient.post<{ documentId: string; uploadUrl: string }>(
            `${CUSTOMERS_BASE_PATH}/${payload.customerId}/documents`,
            {
                name: payload.name || payload.file.name,
                fileName: payload.file.name,
                contentType: payload.file.type || 'application/octet-stream',
            }
        );
        const { documentId, uploadUrl } = initiateResponse.data;

        // Step 2: Upload file binary directly to S3 via presigned URL (no auth headers)
        try {
            await putToPresignedUrl(uploadUrl, payload.file, payload.file.type || 'application/octet-stream');
        } catch (error) {
            // Serwer zapisał już rekord dokumentu. Bez sprzątnięcia na liście zostawał
            // dokument, którego nie da się otworzyć - a użytkownik widział błąd i wgrywał
            // plik drugi raz, więc pozycje się dublowały.
            await apiClient.delete(
                `${CUSTOMERS_BASE_PATH}/${payload.customerId}/documents/${documentId}`,
                { skipErrorToast: true },
            ).catch(() => undefined);
            throw error;
        }

        return {
            id: documentId,
            name: payload.name || payload.file.name,
            fileName: payload.file.name,
            fileUrl: '',
            uploadedAt: new Date().toISOString(),
            uploadedByName: '',
        };
    },

    getDocumentDownload: async (documentId: string): Promise<string> => {
        const response = await apiClient.get<{ url: string }>(
            `/v1/documents/${documentId}/download-url`
        );
        return response.data.url;
    },

    deleteDocument: async (customerId: string, documentId: string): Promise<void> => {
        await apiClient.delete(`${CUSTOMERS_BASE_PATH}/${customerId}/documents/${documentId}`);
    },
};
