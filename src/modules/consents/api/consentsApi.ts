/**
 * API client for consent management operations.
 * Admin operations: /api/v1/consents
 * Customer operations: /api/v1/customers/{customerId}/consents
 */

import { apiClient } from '@/core/apiClient';
import type {
    ConsentResponse,
    ConsentVersionResponse,
    CreateConsentRequest,
    AddVersionRequest,
    ConsentStatusResponse,
    SignConsentRequest,
    SignConsentResponse,
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
 * Get a single consent definition by ID.
 */
export const getConsentDefinition = async (id: string): Promise<ConsentResponse> => {
    const response = await apiClient.get<ConsentResponse>(`${BASE_PATH}/${id}`);
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
 * Update consent display configuration (name, stage, mandatory, order).
 */
export const updateConsentDefinition = async (
    id: string,
    request: Partial<CreateConsentRequest>
): Promise<ConsentResponse> => {
    const response = await apiClient.patch<ConsentResponse>(`${BASE_PATH}/${id}`, request);
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
 */
export const uploadFileToS3 = async (
    uploadUrl: string,
    file: File,
    _onProgress?: (progress: number) => void
): Promise<void> => {
    await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': 'application/pdf',
        },
    });
};

// ===== Customer Operations =====

/**
 * Get all consent statuses for a customer.
 */
export const getCustomerConsentStatus = async (customerId: string): Promise<ConsentStatusResponse> => {
    const response = await apiClient.get<ConsentStatusResponse>(
        `/v1/customers/${customerId}/consents`
    );
    return response.data;
};

/**
 * Record a customer signature on a specific consent template version.
 */
export const signCustomerConsent = async (
    customerId: string,
    templateId: string,
    request: SignConsentRequest = {}
): Promise<SignConsentResponse> => {
    const response = await apiClient.post<SignConsentResponse>(
        `/v1/customers/${customerId}/consents/${templateId}/sign`,
        request
    );
    return response.data;
};

/**
 * Revoke a previously recorded consent.
 */
export const revokeCustomerConsent = async (
    customerId: string,
    consentId: string
): Promise<void> => {
    await apiClient.delete(`/v1/customers/${customerId}/consents/${consentId}`);
};

export const consentsApi = {
    // Admin operations
    getConsentDefinitions,
    getConsentDefinition,
    createConsentDefinition,
    updateConsentDefinition,
    deleteConsentDefinition,
    addConsentVersion,
    uploadFileToS3,

    // Customer operations
    getCustomerConsentStatus,
    signCustomerConsent,
    revokeCustomerConsent,
};
