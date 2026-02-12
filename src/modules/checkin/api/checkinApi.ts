// src/modules/checkin/api/checkinApi.ts

import { apiClient } from '@/core';
import type {
    ReservationToVisitPayload,
    CreateVisitFromReservationResponse,
    MobileUploadSession,
    UploadPhotoPayload,
    PhotoUploadResponse,
    PhotoSlot,
} from '../types';

const USE_MOCKS = false;
const BASE_PATH = '/checkin';

const mockUploadSession: MobileUploadSession = {
    sessionId: 'session_123',
    token: 'mock_jwt_token_abc123',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    uploadedPhotos: [],
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
    reservationId: string
): Promise<MobileUploadSession> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { ...mockUploadSession, sessionId: `session_${reservationId}` };
};

const mockUploadPhoto = async (
    payload: UploadPhotoPayload
): Promise<PhotoUploadResponse> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
        fileId: `file_${Date.now()}`,
        fileName: payload.photo.name,
        uploadedAt: new Date().toISOString(),
    };
};

const mockGetSessionPhotos = async (
    _sessionId: string
): Promise<PhotoSlot[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return [
        {
            id: 'photo_1',
            fileId: 'file_1',
            fileName: 'vehicle1.jpg',
            uploadedAt: new Date().toISOString(),
            description: 'Zdjęcie pojazdu',
        },
        {
            id: 'photo_2',
            fileId: 'file_2',
            fileName: 'vehicle2.jpg',
            uploadedAt: new Date().toISOString(),
        },
    ];
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

    createUploadSession: async (
        reservationId: string
    ): Promise<MobileUploadSession> => {
        if (USE_MOCKS) {
            return mockCreateUploadSession(reservationId);
        }
        const response = await apiClient.post(
            `${BASE_PATH}/upload-session`,
            { reservationId }
        );
        return response.data;
    },

    uploadPhoto: async (
        payload: UploadPhotoPayload
    ): Promise<PhotoUploadResponse> => {
        if (USE_MOCKS) {
            return mockUploadPhoto(payload);
        }

        const formData = new FormData();
        formData.append('photo', payload.photo);
        formData.append('token', payload.token);
        if (payload.description) {
            formData.append('description', payload.description);
        }

        const response = await apiClient.post(
            `${BASE_PATH}/sessions/${payload.sessionId}/photos`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    getSessionPhotos: async (sessionId: string): Promise<PhotoSlot[]> => {
        if (USE_MOCKS) {
            return mockGetSessionPhotos(sessionId);
        }
        const response = await apiClient.get(
            `${BASE_PATH}/sessions/${sessionId}/photos`
        );
        return response.data;
    },

    validateSession: async (sessionId: string, token: string): Promise<boolean> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 300));
            return true;
        }
        try {
            await apiClient.get(
                `${BASE_PATH}/sessions/${sessionId}/validate`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            return true;
        } catch {
            return false;
        }
    },
};
