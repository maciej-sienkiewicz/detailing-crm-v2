// src/modules/checkin/api/checkinApi.ts

import { apiClient } from '@/core';
import type {
    ReservationToVisitPayload,
    WalkInVisitPayload,
    CreateVisitFromReservationResponse,
    MobileUploadSession,
    UploadUrlRequest,
    UploadUrlResponse,
    SessionPhotosResponse,
    PhotoSlot,
    QRTokenResponse,
    MobileCheckinContext,
    MobilePhotoUploadResponse,
    MobileDamagePointsRequest,
    MobileDamagePointsResponse,
    DamagePoint,
} from '../types';

const USE_MOCKS = false;
const BASE_PATH = '/checkin';
const PHOTO_SESSIONS_PATH = '/photo-sessions';
const MOBILE_BASE_PATH = '/mobile/checkin';

const mockUploadSession: MobileUploadSession = {
    sessionId: 'session_123',
    token: 'mock_jwt_token_abc123',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

const mockCreateVisitFromReservation = async (
    payload: ReservationToVisitPayload
): Promise<CreateVisitFromReservationResponse> => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    console.log('Mock: Creating visit from reservation', payload);
    return {
        visitId: `visit_${Date.now()}`,
        protocols: [
            {
                id: `protocol_${Date.now()}_1`,
                templateId: 'template_1',
                templateName: 'Protokół przyjęcia pojazdu',
                stage: 'CHECK_IN',
                isMandatory: true,
                status: 'READY_FOR_SIGNATURE',
                filledPdfUrl: 'https://example.com/protocol1.pdf'
            },
            {
                id: `protocol_${Date.now()}_2`,
                templateId: 'template_2',
                templateName: 'Warunki świadczenia usług',
                stage: 'CHECK_IN',
                isMandatory: true,
                status: 'READY_FOR_SIGNATURE',
                filledPdfUrl: 'https://example.com/protocol2.pdf'
            }
        ]
    };
};

const mockCreateUploadSession = async (
    appointmentId: string
): Promise<MobileUploadSession> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { ...mockUploadSession, sessionId: `session_${appointmentId}` };
};

const mockGenerateUploadUrl = async (
    _sessionId: string,
    _request: UploadUrlRequest
): Promise<UploadUrlResponse> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
        photoId: `photo_${Date.now()}`,
        uploadUrl: `https://mock-s3.amazonaws.com/upload/${Date.now()}`,
        expiresAt: new Date(Date.now() + 900000).toISOString(), // 15 min
    };
};

const mockGetSessionPhotos = async (
    _sessionId: string
): Promise<SessionPhotosResponse> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return {
        photos: [
            {
                id: 'photo_1',
                fileName: 'vehicle1.jpg',
                fileSize: 2048576,
                uploadedAt: new Date().toISOString(),
                thumbnailUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80',
                tags: ['przód', 'PPF'],
            },
            {
                id: 'photo_2',
                fileName: 'vehicle2.jpg',
                fileSize: 1524288,
                uploadedAt: new Date().toISOString(),
                thumbnailUrl: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&q=80',
                tags: ['tył'],
            },
            {
                id: 'photo_3',
                fileName: 'vehicle3.jpg',
                fileSize: 1820000,
                uploadedAt: new Date().toISOString(),
                thumbnailUrl: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80',
                tags: [],
            },
        ],
    };
};

const mockDeletePhoto = async (
    _sessionId: string,
    _photoId: string
): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
};

export const checkinApi = {
    createVisitFromReservation: async (
        payload: ReservationToVisitPayload
    ): Promise<CreateVisitFromReservationResponse> => {
        if (USE_MOCKS) {
            return mockCreateVisitFromReservation(payload);
        }
        const response = await apiClient.post(
            `${BASE_PATH}/reservation-to-visit`,
            payload
        );
        return response.data;
    },

    createWalkInVisit: async (
        payload: WalkInVisitPayload
    ): Promise<CreateVisitFromReservationResponse> => {
        if (USE_MOCKS) {
            return mockCreateVisitFromReservation(payload as any);
        }
        const response = await apiClient.post(
            `${BASE_PATH}/walk-in`,
            payload
        );
        return response.data;
    },

    /**
     * Step 1: Create upload session with appointmentId
     * Returns sessionId + token for subsequent operations
     */
    createUploadSession: async (
        appointmentId: string
    ): Promise<MobileUploadSession> => {
        if (USE_MOCKS) {
            return mockCreateUploadSession(appointmentId);
        }
        const response = await apiClient.post(
            `${PHOTO_SESSIONS_PATH}`,
            { appointmentId }
        );
        return response.data;
    },

    /**
     * Step 2: Generate presigned upload URL for a photo
     * Returns photoId + uploadUrl for direct S3 upload
     */
    generateUploadUrl: async (
        sessionId: string,
        request: UploadUrlRequest
    ): Promise<UploadUrlResponse> => {
        if (USE_MOCKS) {
            return mockGenerateUploadUrl(sessionId, request);
        }
        const response = await apiClient.post(
            `${PHOTO_SESSIONS_PATH}/${sessionId}/upload-url`,
            request
        );
        return response.data;
    },

    /**
     * Step 3: Upload photo directly to S3 using presigned URL
     */
    uploadToS3: async (uploadUrl: string, file: File): Promise<void> => {
        await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            },
        });
    },

    /**
     * Get list of uploaded photos for a session
     * Returns photos with thumbnailUrl (presigned, valid for 10 min)
     */
    getSessionPhotos: async (sessionId: string): Promise<SessionPhotosResponse> => {
        if (USE_MOCKS) {
            return mockGetSessionPhotos(sessionId);
        }
        const response = await apiClient.get(
            `${PHOTO_SESSIONS_PATH}/${sessionId}/photos`
        );
        return response.data;
    },

    /**
     * Delete a photo from the session
     */
    deletePhoto: async (sessionId: string, photoId: string): Promise<void> => {
        if (USE_MOCKS) {
            return mockDeletePhoto(sessionId, photoId);
        }
        await apiClient.delete(
            `${PHOTO_SESSIONS_PATH}/${sessionId}/photos/${photoId}`
        );
    },

    // ─── QR Upload Token ─────────────────────────────────────────────────────

    /**
     * Generate a QR upload token for an appointment.
     * Calling this twice replaces the previous token.
     */
    generateQRToken: async (appointmentId: string): Promise<QRTokenResponse> => {
        const response = await apiClient.post(
            `${BASE_PATH}/${appointmentId}/upload-token`
        );
        return response.data;
    },

    // ─── Mobile (public, no session) ─────────────────────────────────────────

    /**
     * Fetch context info for the mobile uploader.
     * Uses X-Upload-Token header — no session cookie needed.
     */
    getMobileCheckinContext: async (token: string): Promise<MobileCheckinContext> => {
        const response = await apiClient.get(`${MOBILE_BASE_PATH}/context`, {
            headers: { 'X-Upload-Token': token },
        });
        return response.data;
    },

    /**
     * Upload a single photo from the mobile device.
     * Uses X-Upload-Token header — no session cookie needed.
     */
    uploadMobilePhoto: async (
        file: File | Blob,
        fileName: string,
        token: string
    ): Promise<MobilePhotoUploadResponse> => {
        const formData = new FormData();
        formData.append('photo', file, fileName);
        const response = await apiClient.post(
            `${MOBILE_BASE_PATH}/photos`,
            formData,
            {
                headers: {
                    'X-Upload-Token': token,
                    // Content-Type is set automatically by axios for FormData
                },
            }
        );
        return response.data;
    },

    /**
     * Delete a QR-uploaded photo by photoId (desktop side).
     */
    deleteCheckinPhoto: async (checkinId: string, photoId: string): Promise<void> => {
        await apiClient.delete(
            `${BASE_PATH}/${checkinId}/photos/${photoId}`
        );
    },

    // ─── Mobile Damage Points ────────────────────────────────────────────────

    /**
     * Save (replace) damage points from mobile during a check-in session.
     * Uses X-Upload-Token header — no session cookie needed.
     */
    saveMobileDamagePoints: async (
        token: string,
        damagePoints: DamagePoint[],
    ): Promise<MobileDamagePointsResponse> => {
        const payload: MobileDamagePointsRequest = { damagePoints };
        const response = await apiClient.put(
            `${MOBILE_BASE_PATH}/damage-points`,
            payload,
            { headers: { 'X-Upload-Token': token } },
        );
        return response.data;
    },

    /**
     * Fetch damage points saved by mobile for this check-in session.
     * Uses X-Upload-Token header — no session cookie needed.
     */
    getMobileDamagePoints: async (token: string): Promise<MobileDamagePointsResponse> => {
        const response = await apiClient.get(
            `${MOBILE_BASE_PATH}/damage-points`,
            { headers: { 'X-Upload-Token': token } },
        );
        return response.data;
    },

    /**
     * Fetch damage points saved by mobile for a specific appointment (desktop side).
     * Used by CheckInWizard to pre-populate the damage section.
     */
    getAppointmentMobileDamagePoints: async (appointmentId: string): Promise<MobileDamagePointsResponse | null> => {
        try {
            const response = await apiClient.get(
                `${BASE_PATH}/${appointmentId}/mobile-damage-points`,
            );
            return response.data;
        } catch {
            return null;
        }
    },
};
