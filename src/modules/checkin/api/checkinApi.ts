// src/modules/checkin/api/checkinApi.ts

import { apiClient } from '@/core';
import type {
    ReservationToVisitPayload,
    CreateVisitFromReservationResponse,
    MobileUploadSession,
    UploadUrlRequest,
    UploadUrlResponse,
    SessionPhotosResponse,
    PhotoSlot,
} from '../types';

const USE_MOCKS = false;
const BASE_PATH = '/checkin';
const PHOTO_SESSIONS_PATH = '/photo-sessions';

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
                thumbnailUrl: 'https://mock-s3.amazonaws.com/thumbnail/photo_1',
            },
            {
                id: 'photo_2',
                fileName: 'vehicle2.jpg',
                fileSize: 1524288,
                uploadedAt: new Date().toISOString(),
                thumbnailUrl: 'https://mock-s3.amazonaws.com/thumbnail/photo_2',
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
};
