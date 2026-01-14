/**
 * Type definitions for the consent management module.
 * Reflects backend DTOs from AdminConsentController and CustomerConsentController.
 */

/**
 * Consent status types
 */
export enum ConsentStatus {
    VALID = 'VALID',                 // Consent is up-to-date and signed
    REQUIRED = 'REQUIRED',           // Needs customer signature
    OUTDATED = 'OUTDATED'           // Signed old version but no re-sign required
}

/**
 * Consent definition - represents a type of consent (e.g., RODO, Marketing)
 */
export interface ConsentDefinition {
    id: string;
    slug: string;                    // e.g., "rodo", "marketing", "kontakt-po-18"
    name: string;                    // e.g., "RODO", "Zgoda marketingowa"
    description?: string;
    createdAt: string;
    createdBy: string;
    studioId: string;
}

/**
 * Consent template - a versioned PDF template for a consent definition
 */
export interface ConsentTemplate {
    id: string;
    definitionId: string;
    version: number;
    requiresResign: boolean;         // Should all customers re-sign when this version is activated?
    isActive: boolean;
    s3Key: string;
    downloadUrl?: string;
    createdAt: string;
    createdBy: string;
}

/**
 * Customer consent record - tracks which consents a customer has signed
 */
export interface CustomerConsent {
    id: string;
    customerId: string;
    definitionId: string;
    templateId: string;
    templateVersion: number;
    status: ConsentStatus;
    signedAt?: string;
    signatureData?: string;          // Base64 encoded signature image
    ipAddress?: string;
    createdAt: string;
    updatedAt: string;
}

// ===== API Request/Response DTOs =====

/**
 * Request to create a new consent definition
 */
export interface CreateConsentDefinitionRequest {
    slug: string;
    name: string;
    description?: string;
}

/**
 * Response after creating a consent definition
 */
export interface CreateConsentDefinitionResponse {
    definitionId: string;
    slug: string;
    name: string;
}

/**
 * Request to upload a new consent template version
 */
export interface UploadTemplateRequest {
    definitionId: string;
    requiresResign: boolean;
    setAsActive?: boolean;           // Default: true
}

/**
 * Response with S3 presigned upload URL
 */
export interface UploadTemplateResponse {
    templateId: string;
    version: number;
    uploadUrl: string;
    s3Key: string;
}

/**
 * Request to get customer consents
 */
export interface GetCustomerConsentsRequest {
    customerId: string;
}

/**
 * Response with customer consents and their statuses
 */
export interface CustomerConsentDetails {
    consent: CustomerConsent;
    definition: ConsentDefinition;
    currentTemplate: ConsentTemplate;
}

/**
 * Request to sign a consent
 */
export interface SignConsentRequest {
    customerId: string;
    templateId: string;
    signatureData?: string;          // Base64 encoded signature image
}

/**
 * Response after signing a consent
 */
export interface SignConsentResponse {
    consentId: string;
    status: ConsentStatus;
    signedAt: string;
}

// ===== View Models for UI =====

/**
 * Definition with its active template for display
 */
export interface ConsentDefinitionWithTemplate {
    definition: ConsentDefinition;
    activeTemplate?: ConsentTemplate;
    allTemplates: ConsentTemplate[];
}
