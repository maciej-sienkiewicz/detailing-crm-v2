/**
 * API client for consent management operations.
 * Handles both admin (definitions/templates) and customer (signing) operations.
 */

import { apiClient } from '@/core/apiClient';
import type {
    ConsentDefinition,
    ConsentTemplate,
    ConsentDefinitionWithTemplate,
    CreateConsentDefinitionRequest,
    CreateConsentDefinitionResponse,
    UploadTemplateRequest,
    UploadTemplateResponse,
    CustomerConsentDetails,
    SignConsentRequest,
    SignConsentResponse,
} from '../types';

const ADMIN_BASE_PATH = '/v1/admin/consents';
const CUSTOMER_BASE_PATH = '/v1/customer/consents';

// ===== Admin Operations =====

/**
 * Get all consent definitions with their active templates
 */
export const getConsentDefinitions = async (): Promise<ConsentDefinitionWithTemplate[]> => {
    const response = await apiClient.get<ConsentDefinitionWithTemplate[]>(
        `${ADMIN_BASE_PATH}/definitions`
    );
    return response.data;
};

/**
 * Get a single consent definition by ID
 */
export const getConsentDefinition = async (definitionId: string): Promise<ConsentDefinition> => {
    const response = await apiClient.get<ConsentDefinition>(
        `${ADMIN_BASE_PATH}/definitions/${definitionId}`
    );
    return response.data;
};

/**
 * Create a new consent definition
 */
export const createConsentDefinition = async (
    request: CreateConsentDefinitionRequest
): Promise<CreateConsentDefinitionResponse> => {
    const response = await apiClient.post<CreateConsentDefinitionResponse>(
        `${ADMIN_BASE_PATH}/definitions`,
        request
    );
    return response.data;
};

/**
 * Get all templates for a consent definition
 */
export const getConsentTemplates = async (definitionId: string): Promise<ConsentTemplate[]> => {
    const response = await apiClient.get<ConsentTemplate[]>(
        `${ADMIN_BASE_PATH}/definitions/${definitionId}/templates`
    );
    return response.data;
};

/**
 * Upload a new consent template version.
 * Returns presigned S3 URL for file upload.
 */
export const uploadConsentTemplate = async (
    request: UploadTemplateRequest
): Promise<UploadTemplateResponse> => {
    const response = await apiClient.post<UploadTemplateResponse>(
        `${ADMIN_BASE_PATH}/templates`,
        request
    );
    return response.data;
};

/**
 * Upload PDF file to S3 using presigned URL
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

    // Note: If we need progress tracking, we'd need to use XMLHttpRequest or axios
    // For now, using native fetch for simplicity
};

/**
 * Set a template as active (and deactivate others)
 */
export const setTemplateActive = async (
    templateId: string,
    definitionId: string
): Promise<void> => {
    await apiClient.patch(
        `${ADMIN_BASE_PATH}/definitions/${definitionId}/templates/${templateId}/activate`
    );
};

/**
 * Get download URL for a consent template PDF
 */
export const getTemplateDownloadUrl = async (templateId: string): Promise<string> => {
    const response = await apiClient.get<{ downloadUrl: string }>(
        `${ADMIN_BASE_PATH}/templates/${templateId}/download-url`
    );
    return response.data.downloadUrl;
};

// ===== Customer Operations =====

/**
 * Get all consents for a customer with their current status
 */
export const getCustomerConsents = async (customerId: string): Promise<CustomerConsentDetails[]> => {
    const response = await apiClient.get<CustomerConsentDetails[]>(
        `${CUSTOMER_BASE_PATH}/${customerId}`
    );
    return response.data;
};

/**
 * Sign a consent for a customer
 */
export const signConsent = async (request: SignConsentRequest): Promise<SignConsentResponse> => {
    const response = await apiClient.post<SignConsentResponse>(
        `${CUSTOMER_BASE_PATH}/${request.customerId}/sign`,
        {
            templateId: request.templateId,
            signatureData: request.signatureData,
        }
    );
    return response.data;
};

/**
 * Get PDF URL for customer to view before signing
 */
export const getConsentPdfUrl = async (templateId: string): Promise<string> => {
    const response = await apiClient.get<{ pdfUrl: string }>(
        `${CUSTOMER_BASE_PATH}/templates/${templateId}/pdf-url`
    );
    return response.data.pdfUrl;
};

export const consentsApi = {
    // Admin operations
    getConsentDefinitions,
    getConsentDefinition,
    createConsentDefinition,
    getConsentTemplates,
    uploadConsentTemplate,
    uploadFileToS3,
    setTemplateActive,
    getTemplateDownloadUrl,

    // Customer operations
    getCustomerConsents,
    signConsent,
    getConsentPdfUrl,
};
