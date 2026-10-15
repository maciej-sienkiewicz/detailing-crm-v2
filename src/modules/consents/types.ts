/**
 * Definicje dokumentów zgód (Ustawienia → Dokumenty). Odpowiada DTO z ConsentController.
 * Zgody konkretnego klienta obsługuje moduł `customers` (własne typy i hooki).
 */

import type { ProtocolStage } from '@/modules/protocols/types';

export type { ProtocolStage };

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
    /** Podgląd przez backend: wersja systemowa z logo studia w nagłówku (gdy włączone). */
    previewUrl?: string | null;
    createdAt: string;
}

/**
 * Full consent definition with its versions.
 * Returned by GET /api/v1/consents.
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
