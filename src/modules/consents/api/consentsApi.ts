/**
 * API definicji dokumentów zgód: /api/v1/consents.
 * Zgody konkretnego klienta (/api/v1/customers/{customerId}/consents) woła moduł `customers`.
 */

import { apiClient } from '@/core/apiClient';
import type {
    ConsentResponse,
    ConsentVersionResponse,
    CreateConsentRequest,
    AddVersionRequest,
} from '../types';

const BASE_PATH = '/v1/consents';

// ===== Admin Operations =====

/**
 * List all active consent definitions with their current version info.
 */
export const getConsentDefinitions = async (): Promise<ConsentResponse[]> => {
    const response = await apiClient.get<ConsentResponse[]>(BASE_PATH);
    return response.data;
};

/**
 * Create a new consent definition.
 * Slug is auto-generated from the name by the backend.
 */
export const createConsentDefinition = async (
    request: CreateConsentRequest
): Promise<ConsentResponse> => {
    const response = await apiClient.post<ConsentResponse>(BASE_PATH, request);
    return response.data;
};

/**
 * Deactivate a consent definition.
 * Existing customer signatures are preserved in the audit trail.
 */
export const deleteConsentDefinition = async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${id}`);
};

/**
 * Publish a new PDF version for an existing consent.
 * Returns a ConsentVersionResponse with pdfUrl as a presigned S3 upload URL.
 */
export const addConsentVersion = async (
    definitionId: string,
    request: AddVersionRequest
): Promise<ConsentVersionResponse> => {
    const response = await apiClient.post<ConsentVersionResponse>(
        `${BASE_PATH}/${definitionId}/versions`,
        request
    );
    return response.data;
};

/**
 * Upload PDF file to S3 using presigned URL.
 *
 * `fetch` nie rzuca przy odpowiedzi 4xx/5xx - bez sprawdzenia `response.ok`
 * odrzucony upload (wygasły link, zły Content-Type) kończył się „sukcesem", a zgoda
 * zostawała z wersją bez pliku. Rzucamy więc błąd ze zdaniem, które da się pokazać
 * użytkownikowi, także przy braku sieci (wtedy fetch rzuca „Failed to fetch").
 */
export const uploadFileToS3 = async (uploadUrl: string, file: File): Promise<void> => {
    let response: Response;
    try {
        response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': 'application/pdf',
            },
        });
    } catch {
        throw new Error('Nie udało się wysłać pliku PDF. Sprawdź połączenie z internetem i spróbuj ponownie.');
    }
    if (!response.ok) {
        throw new Error('Nie udało się wgrać pliku PDF. Spróbuj ponownie.');
    }
};

export const consentsApi = {
    // Admin operations
    getConsentDefinitions,
    createConsentDefinition,
    deleteConsentDefinition,
    addConsentVersion,
    uploadFileToS3,
};
