// src/modules/vehicles/api/vehicleApi.ts

import { putToPresignedUrl } from '@/common/utils/presignedUpload';
import type { Page } from '@/core/page';
import { apiClient } from '@/core/apiClient';
import type {
    VehicleDetailResponse,
    VehicleFilters,
    CreateVehiclePayload,
    UpdateVehiclePayload,
    AssignOwnerPayload,
    UploadVehiclePhotoPayload,
    UploadVehiclePhotoResponse,
    Vehicle,
    VehicleListItem,
    VehicleDocument,
    VehicleDocumentUploadResponse,
    UploadVehicleDocumentPayload,
    VehicleNote,
    CreateVehicleNotePayload,
    UpdateVehicleNotePayload,
    VehiclePhoto,
    VehicleVisit,
    VehicleAppointment,
    VehicleComment,
} from '../types';
import type { CalendarEventsResponse } from '@/modules/calendar/types';

const BASE_PATH = '/v1/vehicles';

export const vehicleApi = {
    getVehicles: async (filters: VehicleFilters, signal?: AbortSignal): Promise<Page<VehicleListItem>> => {
        const params = new URLSearchParams({
            page: filters.page.toString(),
            pageSize: filters.pageSize.toString(),
            ...(filters.search && { search: filters.search }),
            ...(filters.sortBy && { sortBy: filters.sortBy }),
            ...(filters.sortDirection && { sortDirection: filters.sortDirection }),
            ...(filters.status && { status: filters.status }),
            ...(filters.kind && { kind: filters.kind }),
            ...(filters.brand && { brand: filters.brand }),
            ...(filters.model && { model: filters.model }),
            ...(filters.yearFrom != null && { yearFrom: filters.yearFrom.toString() }),
            ...(filters.yearTo != null && { yearTo: filters.yearTo.toString() }),
            ...(filters.minVisits != null && { minVisits: filters.minVisits.toString() }),
            ...(filters.maxVisits != null && { maxVisits: filters.maxVisits.toString() }),
            ...(filters.minRevenue != null && { minRevenue: filters.minRevenue.toString() }),
            ...(filters.maxRevenue != null && { maxRevenue: filters.maxRevenue.toString() }),
            ...(filters.services?.length && { services: filters.services.join(',') }),
            ...(filters.lastServiceWithinDays != null && { lastServiceWithinDays: filters.lastServiceWithinDays.toString() }),
            ...(filters.notServicedSinceDays != null && { notServicedSinceDays: filters.notServicedSinceDays.toString() }),
            ...(filters.includeDeleted && { includeDeleted: 'true' }),
        });
        const response = await apiClient.get<Page<VehicleListItem>>(`${BASE_PATH}?${params}`, { signal });
        return response.data;
    },

    getVehicleDetail: async (vehicleId: string): Promise<VehicleDetailResponse> => {
        const response = await apiClient.get(`${BASE_PATH}/${vehicleId}`);
        return response.data;
    },

    createVehicle: async (payload: CreateVehiclePayload): Promise<Vehicle> => {
        const response = await apiClient.post(BASE_PATH, payload);
        return response.data.data;
    },

    updateVehicle: async (vehicleId: string, payload: UpdateVehiclePayload): Promise<Vehicle> => {
        const response = await apiClient.patch(`${BASE_PATH}/${vehicleId}`, payload);
        return response.data.data;
    },

    deleteVehicle: async (vehicleId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${vehicleId}`);
    },

    assignOwner: async (vehicleId: string, payload: AssignOwnerPayload): Promise<Vehicle> => {
        const response = await apiClient.post(`${BASE_PATH}/${vehicleId}/owners`, payload);
        return response.data.data;
    },

    removeOwner: async (vehicleId: string, customerId: string): Promise<Vehicle> => {
        const response = await apiClient.delete(`${BASE_PATH}/${vehicleId}/owners/${customerId}`);
        return response.data.data;
    },

    getDocuments: async (vehicleId: string): Promise<VehicleDocument[]> => {
        const response = await apiClient.get<{ documents: VehicleDocument[] }>(
            `${BASE_PATH}/${vehicleId}/documents`
        );
        return response.data.documents;
    },

    uploadDocument: async (vehicleId: string, payload: UploadVehicleDocumentPayload): Promise<VehicleDocument> => {
        // Step 1: Initiate upload (backend returns presigned S3 URL)
        const initiateResponse = await apiClient.post<VehicleDocumentUploadResponse>(
            `${BASE_PATH}/${vehicleId}/documents`,
            {
                name: payload.name || payload.file.name,
                fileName: payload.file.name,
                contentType: payload.file.type || 'application/octet-stream',
            }
        );
        const { documentId, uploadUrl } = initiateResponse.data;

        // Step 2: Upload file binary directly to S3 (no auth headers)
        try {
            await putToPresignedUrl(uploadUrl, payload.file, payload.file.type || 'application/octet-stream');
        } catch (error) {
            // Rekord dokumentu już jest - bez sprzątnięcia zostawał na liście bez pliku.
            await apiClient.delete(`${BASE_PATH}/${vehicleId}/documents/${documentId}`, { skipErrorToast: true })
                .catch(() => undefined);
            throw error;
        }

        return {
            id: documentId,
            name: payload.name || payload.file.name,
            fileName: payload.file.name,
            fileUrl: '',
            uploadedAt: new Date().toISOString(),
            uploadedByName: '',
            source: 'VEHICLE',
        };
    },

    deleteDocument: async (vehicleId: string, documentId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${vehicleId}/documents/${documentId}`);
    },

    // New photo gallery endpoints
    getPhotoGallery: async (vehicleId: string, page: number = 1, pageSize: number = 20): Promise<Page<VehiclePhoto>> => {
        const response = await apiClient.get<Page<VehiclePhoto>>(`${BASE_PATH}/${vehicleId}/photos/gallery`, {
            params: { page, pageSize },
        });
        return response.data;
    },

    uploadVehiclePhoto: async (vehicleId: string, payload: UploadVehiclePhotoPayload): Promise<UploadVehiclePhotoResponse> => {
        const response = await apiClient.post(`${BASE_PATH}/${vehicleId}/photos`, payload);
        return response.data;
    },

    deleteVehiclePhoto: async (vehicleId: string, photoId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${vehicleId}/photos/${photoId}`);
    },

    getNotes: async (vehicleId: string): Promise<VehicleNote[]> => {
        const response = await apiClient.get<VehicleNote[] | { notes: VehicleNote[] }>(
            `${BASE_PATH}/${vehicleId}/notes`
        );
        return Array.isArray(response.data) ? response.data : response.data.notes ?? [];
    },

    createNote: async (vehicleId: string, payload: CreateVehicleNotePayload): Promise<VehicleNote> => {
        const response = await apiClient.post<VehicleNote>(
            `${BASE_PATH}/${vehicleId}/notes`,
            payload
        );
        return response.data;
    },

    updateNote: async (vehicleId: string, noteId: string, payload: UpdateVehicleNotePayload): Promise<VehicleNote> => {
        const response = await apiClient.patch<VehicleNote>(
            `${BASE_PATH}/${vehicleId}/notes/${noteId}`,
            payload
        );
        return response.data;
    },

    deleteNote: async (vehicleId: string, noteId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${vehicleId}/notes/${noteId}`);
    },

    getVisits: async (vehicleId: string, page = 1, pageSize = 50): Promise<Page<VehicleVisit>> => {
        const response = await apiClient.get<Page<VehicleVisit>>(
            `${BASE_PATH}/${vehicleId}/visits`,
            { params: { page, pageSize } }
        );
        return response.data;
    },

    getAppointments: async (vehicleId: string, page = 1, pageSize = 50): Promise<Page<VehicleAppointment>> => {
        const response = await apiClient.get<Page<VehicleAppointment>>(
            `${BASE_PATH}/${vehicleId}/appointments`,
            { params: { page, pageSize } }
        );
        return response.data;
    },

    getComments: async (vehicleId: string, page = 1, pageSize = 20): Promise<Page<VehicleComment>> => {
        const response = await apiClient.get<Page<VehicleComment>>(
            `${BASE_PATH}/${vehicleId}/comments`,
            { params: { page, pageSize } }
        );
        return response.data;
    },

    getDeletedVisits: async (vehicleId: string): Promise<Page<{ id: string; title?: string | null; description: string; date: string; customerName: string; status: string; totalCost: { grossAmount: number; currency: string } | null; deletedAt?: string | null }>> => {
        const response = await apiClient.get(`${BASE_PATH}/${vehicleId}/visits`, {
            params: { deleted: 'only' },
        });
        return response.data;
    },

    getCalendarEvents: async (vehicleId: string): Promise<CalendarEventsResponse> => {
        // Cała historia pojazdu - bez okna „5 lat wstecz" liczonego od teraz (patrz karta klienta).
        const response = await apiClient.get<CalendarEventsResponse>('/v1/calendar/events', {
            params: {
                vehicleId,
                appointmentStatuses: 'ABANDONED,CREATED',
                visitStatuses: 'READY_FOR_PICKUP,IN_PROGRESS,COMPLETED',
            },
        });
        return response.data;
    },
};
