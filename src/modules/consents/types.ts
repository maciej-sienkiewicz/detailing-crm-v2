/**
 * Type definitions for the consent management module.
 * Reflects backend DTOs from ConsentController and CustomerConsentController.
 */

import type { ProtocolStage } from '@/modules/protocols/types';

export type { ProtocolStage };

/**
 * Consent status types
 */
export enum ConsentStatus {
    VALID = 'VALID',                 // Consent is up-to-date and signed
    REQUIRED = 'REQUIRED',           // Needs customer signature
    OUTDATED = 'OUTDATED'           // Signed old version but no re-sign required
}

// ===== Admin API Types =====

/**
 * A single versioned PDF attached to a consent definition.
 * On creation, pdfUrl is a presigned S3 upload URL.
 * On subsequent GETs, pdfUrl is a download URL (or null if not yet uploaded).
 */
export interface ConsentVersionResponse {
    versionId: string;
    version: number;
    isActive: boolean;
    requiresResign: boolean;
    pdfUrl: string | null;
    createdAt: string;
}

/**
 * Full consent definition with its versions.
 * Returned by GET /api/v1/consents and GET /api/v1/consents/{id}.
 */
export interface ConsentResponse {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    stage: ProtocolStage;
    isMandatory: boolean;
    displayOrder: number;
    isActive: boolean;
    currentVersion: ConsentVersionResponse | null;
    versions: ConsentVersionResponse[];
    createdAt: string;
    updatedAt: string;
}

/**
 * Request body for POST /api/v1/consents
 */
export interface CreateConsentRequest {
    name: string;
    description?: string;
    stage: ProtocolStage;
    isMandatory?: boolean;
    displayOrder?: number;
}

/**
 * Request body for POST /api/v1/consents/{id}/versions
 */
export interface AddVersionRequest {
    requiresResign?: boolean;
    setAsActive?: boolean;
}

// ===== Customer API Types =====

export type CustomerConsentStatus = 'VALID' | 'OUTDATED' | 'REQUIRED';

/**
 * Single item in the customer consent status list.
 * Matches ConsentStatusItemResponse from CustomerConsentController.
 */
export interface ConsentStatusItem {
    definitionId: string;
    definitionSlug: string;
    definitionName: string;
    isDefinitionActive: boolean;
    stage: ProtocolStage | null;
    isMandatory: boolean;
    displayOrder: number;
    status: CustomerConsentStatus;
    currentTemplateId: string | null;
    currentVersion: number | null;
    signedTemplateId: string | null;
    signedVersion: number | null;
    signedAt: string | null;
    downloadUrl: string | null;
    consentId: string | null;
}

/**
 * Response from GET /api/v1/customers/{customerId}/consents
 */
export interface ConsentStatusResponse {
    consents: ConsentStatusItem[];
}

/**
 * Request body for POST /api/v1/customers/{customerId}/consents/{templateId}/sign
 */
export interface SignConsentRequest {
    requestAttachmentUpload?: boolean;
}

/**
 * Response from signing a consent
 */
export interface SignConsentResponse {
    consentId: string;
    signedAt: string;
    attachmentUploadUrl?: string | null;
    attachmentS3Key?: string | null;
}
