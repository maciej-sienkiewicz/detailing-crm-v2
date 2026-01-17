// src/modules/checkin/api/checkinApi.ts

import { apiClient } from '@/core';
import type {
    ReservationToVisitPayload,
    MobileUploadSession,
    UploadPhotoPayload,
    PhotoUploadResponse,
    PhotoSlot,
} from '../types';

const USE_MOCKS = false;
const BASE_PATH = '/api/checkin';

const mockUploadSession: MobileUploadSession = {
    sessionId: 'session_123',
    token: 'mock_jwt_token_abc123',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    uploadedPhotos: [],
};

const mockCreateVisitFromReservation = async (
    payload: ReservationToVisitPayload
): Promise<{ visitId: string }> => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    console.log('Mock: Creating visit from reservation', payload);
    return { visitId: `visit_${Date.now()}` };
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
    sessionId: string
): Promise<PhotoSlot[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return [
        {
            type: 'front',
            fileId: 'file_1',
            fileName: 'front.jpg',
            uploadedAt: new Date().toISOString(),
        },
        {
            type: 'rear',
            fileId: 'file_2',
            fileName: 'rear.jpg',
            uploadedAt: new Date().toISOString(),
        },
    ];
};

export const checkinApi = {
    createVisitFromReservation: async (
        payload: ReservationToVisitPayload
    ): Promise<{ visitId: string }> => {
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
        formData.append('type', payload.type);
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