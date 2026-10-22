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
import { putToPresignedUrl } from '@/common/utils/presignedUpload';

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
 * PDF zgody prosto do S3 pod adres podpisany przez serwer - tą samą drogą co każdy inny
 * upload (`putToPresignedUrl`: odrzucona wysyłka rzuca błąd, a nie kończy się „sukcesem").
 */
export const uploadFileToS3 = (uploadUrl: string, file: File): Promise<void> =>
    putToPresignedUrl(uploadUrl, file, 'application/pdf');

export const consentsApi = {
    // Admin operations
    getConsentDefinitions,
    createConsentDefinition,
    deleteConsentDefinition,
    addConsentVersion,
    uploadFileToS3,
};
