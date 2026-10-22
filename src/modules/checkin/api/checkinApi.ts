// src/modules/checkin/api/checkinApi.ts

import { putToPresignedUrl } from '@/common/utils/presignedUpload';
import { apiClient } from '@/core';
import type {
    ReservationToVisitPayload,
    WalkInVisitPayload,
    ReviseDraftPayload,
    CreateVisitFromReservationResponse,
    MobileUploadSession,
    UploadUrlRequest,
    UploadUrlResponse,
    SessionPhotosResponse,
    QRTokenResponse,
    MobileCheckinContext,
    MobilePhotoUploadResponse,
    MobileDamagePointsRequest,
    MobileDamagePointsResponse,
    DamagePoint,
    MobileSessionStatus,
} from '../types';

/**
 * Strips client-only fields (upload status, local preview URLs) and photos
 * that never finished uploading before sending damage points to the backend.
 */
const toDamagePointsPayload = (damagePoints: DamagePoint[]): DamagePoint[] =>
    damagePoints.map(point => ({
        id: point.id,
        x: point.x,
        y: point.y,
        note: point.note,
        photos: (point.photos ?? [])
            .filter(ph => ph.status !== 'uploading' && ph.status !== 'failed' && !ph.photoId.startsWith('local-'))
            .map(ph => ({ photoId: ph.photoId, strokes: ph.strokes ?? [] })),
    }));
const BASE_PATH = '/v1/checkin';
const PHOTO_SESSIONS_PATH = '/v1/photo-sessions';
const MOBILE_BASE_PATH = '/v1/mobile/checkin';

export const checkinApi = {
    createVisitFromReservation: async (
        payload: ReservationToVisitPayload
    ): Promise<CreateVisitFromReservationResponse> => {
        const response = await apiClient.post(
            `${BASE_PATH}/appointment-to-visit`,
            { ...payload, damagePoints: toDamagePointsPayload(payload.damagePoints) }
        );
        return response.data;
    },

    createWalkInVisit: async (
        payload: WalkInVisitPayload
    ): Promise<CreateVisitFromReservationResponse> => {
        const response = await apiClient.post(
            `${BASE_PATH}/walk-in`,
            { ...payload, damagePoints: toDamagePointsPayload(payload.damagePoints) }
        );
        return response.data;
    },

    /**
     * „Wróć do formularza" → poprawiony formularz: ten sam szkic wizyty (z numerem
     * i zdjęciami) dostaje wszystkie dane formularza - klienta, pojazd, stan techniczny,
     * uszkodzenia, termin, usługi - i nowe dokumenty przyjęcia. Stare znikają razem
     * z podpisami, bo wypisywały dane sprzed poprawki.
     */
    reviseDraft: async (
        visitId: string,
        payload: ReviseDraftPayload,
    ): Promise<CreateVisitFromReservationResponse> => {
        const response = await apiClient.put(
            `${BASE_PATH}/drafts/${visitId}`,
            { ...payload, damagePoints: toDamagePointsPayload(payload.damagePoints) }
        );
        return response.data;
    },

    /**
     * Step 1: Create upload session with appointmentId
     * Returns sessionId + token for subsequent operations
     */
    createUploadSession: async (
        appointmentId?: string
    ): Promise<MobileUploadSession> => {
        const response = await apiClient.post(
            `${PHOTO_SESSIONS_PATH}`,
            appointmentId ? { appointmentId } : {}
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
        // Sesja zdjęć podpisuje dokładnie ten Content-Type, który przyszedł w prośbie
        // o adres (`file.type`). Odrzucona wysyłka musi rzucić - wcześniej kafelek
        // wyglądał na wysłany, a przy zapisie wizyty serwer nie znajdował pliku.
        await putToPresignedUrl(uploadUrl, file, file.type);
    },

    /**
     * Get list of uploaded photos for a session
     * Returns photos with thumbnailUrl (presigned, valid for 10 min)
     */
    getSessionPhotos: async (sessionId: string): Promise<SessionPhotosResponse> => {
        const response = await apiClient.get(
            `${PHOTO_SESSIONS_PATH}/${sessionId}/photos`
        );
        return response.data;
    },

    /**
     * Delete a photo from the session
     */
    deletePhoto: async (sessionId: string, photoId: string): Promise<void> => {
        await apiClient.delete(
            `${PHOTO_SESSIONS_PATH}/${sessionId}/photos/${photoId}`
        );
    },

    // ─── QR Upload Token ─────────────────────────────────────────────────────

    /**
     * Get the QR upload token for an appointment, creating one if needed.
     *
     * Repeat calls return the SAME token with a refreshed TTL, so re-entering the photo
     * step does not invalidate a QR code that a phone has already scanned. Pass
     * `rotate: true` only to deliberately invalidate the previous code.
     *
     * `vehicleType` to schemat mapy uszkodzeń widoczny na komputerze. Telefon nie zna
     * pojazdu, więc bez niego przy motocyklu otwierałby sedana; serwer zasiewa nim
     * sesję telefonu tylko wtedy, gdy telefon jeszcze niczego nie zapisał.
     */
    generateQRToken: async (
        appointmentId: string,
        options?: { rotate?: boolean; vehicleType?: string },
    ): Promise<QRTokenResponse> => {
        const response = await apiClient.post(
            `${BASE_PATH}/${appointmentId}/upload-token`,
            null,
            {
                params: {
                    rotate: options?.rotate ?? false,
                    ...(options?.vehicleType ? { vehicleType: options.vehicleType } : {}),
                },
            },
        );
        return response.data;
    },

    // ─── Mobile (public, no session) ─────────────────────────────────────────

    /**
     * Fetch context info for the mobile uploader.
     * Uses X-Upload-Token header, no session cookie needed.
     */
    getMobileCheckinContext: async (token: string): Promise<MobileCheckinContext> => {
        const response = await apiClient.get(`${MOBILE_BASE_PATH}/context`, {
            headers: { 'X-Upload-Token': token }, skipErrorToast: true,
        });
        return response.data;
    },

    /**
     * Upload a single photo from the mobile device.
     * Uses X-Upload-Token header, no session cookie needed.
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
                // Błąd pokazuje karta zdjęcia - bez dodatkowego tosta na telefonie.
                skipErrorToast: true,
            }
        );
        return response.data;
    },

    /**
     * Zdjęcie VIN z telefonu (sesja VIN_SCAN): serwer odczytuje numer i oddaje go
     * oknu wpisu na komputerze. `null` - na zdjęciu nie dało się odczytać VIN.
     */
    scanMobileVin: async (file: File, token: string): Promise<string | null> => {
        const formData = new FormData();
        formData.append('photo', file, file.name);
        const response = await apiClient.post<{ vin: string | null }>(`${MOBILE_BASE_PATH}/vin`, formData, {
            headers: { 'X-Upload-Token': token }, skipErrorToast: true,
        });
        return response.data.vin;
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
     * Uses X-Upload-Token header, no session cookie needed.
     */
    saveMobileDamagePoints: async (
        token: string,
        damagePoints: DamagePoint[],
        vehicleType?: string,
    ): Promise<MobileDamagePointsResponse> => {
        const payload: MobileDamagePointsRequest = {
            damagePoints: toDamagePointsPayload(damagePoints),
            vehicleType,
        };
        const response = await apiClient.put(
            `${MOBILE_BASE_PATH}/damage-points`,
            payload,
            { headers: { 'X-Upload-Token': token }, skipErrorToast: true },
        );
        return response.data;
    },

    /**
     * Fetch damage points saved by mobile for this check-in session.
     * Uses X-Upload-Token header, no session cookie needed.
     */
    getMobileDamagePoints: async (token: string): Promise<MobileDamagePointsResponse> => {
        const response = await apiClient.get(
            `${MOBILE_BASE_PATH}/damage-points`,
            { headers: { 'X-Upload-Token': token }, skipErrorToast: true },
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

    /**
     * Mark that the mobile user has finished reviewing and clicked "Gotowe".
     * Requires an active (non-expired) session token.
     */
    markMobileDone: async (token: string): Promise<void> => {
        await apiClient.post(
            `${MOBILE_BASE_PATH}/done`,
            null,
            { headers: { 'X-Upload-Token': token }, skipErrorToast: true },
        );
    },

    /** „Cofnij i edytuj" po „Gotowe" - komputer znowu czeka na telefon. */
    undoMobileDone: async (token: string): Promise<void> => {
        await apiClient.post(
            `${MOBILE_BASE_PATH}/undo-done`,
            null,
            { headers: { 'X-Upload-Token': token }, skipErrorToast: true },
        );
    },

    /**
     * Fetch the lifecycle status of the mobile session.
     * Safe to call even after the visit was created on desktop (token revoked).
     */
    getMobileStatus: async (token: string): Promise<MobileSessionStatus> => {
        const response = await apiClient.get(
            `${MOBILE_BASE_PATH}/status`,
            { headers: { 'X-Upload-Token': token }, skipErrorToast: true },
        );
        return response.data;
    },
    /**
     * Komputer kończy sesję telefonu („Gotowe", zamknięte okno, przerwane przyjęcie).
     * Telefon przy najbliższym sprawdzeniu stanu pokazuje ekran końcowy. Błąd nie
     * zatrzymuje zamykania okna - sesja i tak wygaśnie sama.
     */
    endMobileSession: async (token: string, reason: 'FINISHED' | 'CANCELLED' = 'FINISHED'): Promise<void> => {
        await apiClient.post('/mobile-sessions/end', { token, reason }, { skipErrorToast: true });
    },

    /**
     * Przyjęcie przerwane albo porzucone - kończy sesję telefonu wskazaną przyjęciem
     * (kreator nie trzyma tokenu, trzyma go panel z kodem QR).
     */
    endCheckinMobileSession: async (checkinId: string): Promise<void> => {
        await apiClient.post(`/checkin/${checkinId}/upload-session/end`, null, { skipErrorToast: true });
    },

    /** Okno VIN zamknięte: ten sam kod ma zadziałać po ponownym otwarciu okna. */
    pauseMobileSession: async (token: string): Promise<void> => {
        await apiClient.post('/mobile-sessions/pause', { token }, { skipErrorToast: true });
    },
};
