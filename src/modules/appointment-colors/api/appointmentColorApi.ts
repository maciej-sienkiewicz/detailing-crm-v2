// src/modules/appointment-colors/api/appointmentColorApi.ts
import { apiClient } from '@/core';
import type { Page } from '@/core/page';
import type {
    AppointmentColor,
    AppointmentColorCreateRequest,
    AppointmentColorUpdateRequest,
    AppointmentColorFilters,
} from '../types';

export const appointmentColorApi = {
    getColors: async (filters: AppointmentColorFilters): Promise<Page<AppointmentColor>> => {
        const params: Record<string, string | number | boolean> = {
            page: filters.page || 1,
            pageSize: filters.pageSize || 50,
        };

        if (filters.search) {
            params.search = filters.search;
        }

        if (filters.showInactive !== undefined) {
            params.showInactive = filters.showInactive;
        }

        const response = await apiClient.get<Page<AppointmentColor>>(
            '/v1/appointment-colors',
            { params }
        );
        return response.data;
    },

    getColorById: async (id: string): Promise<AppointmentColor> => {
        const response = await apiClient.get<AppointmentColor>(`/v1/appointment-colors/${id}`);
        return response.data;
    },

    createColor: async (data: AppointmentColorCreateRequest): Promise<AppointmentColor> => {
        const response = await apiClient.post<AppointmentColor>('/v1/appointment-colors', data);
        return response.data;
    },

    updateColor: async (id: string, data: AppointmentColorUpdateRequest): Promise<AppointmentColor> => {
        const response = await apiClient.put<AppointmentColor>(
            `/v1/appointment-colors/${id}`,
            data
        );
        return response.data;
    },

    deleteColor: async (id: string): Promise<void> => {
        await apiClient.delete(`/v1/appointment-colors/${id}`);
    },

    /** Ustawia kolor jako domyślny; poprzedni domyślny traci tę rolę po stronie backendu. */
    setDefault: async (id: string): Promise<AppointmentColor> => {
        const response = await apiClient.put<AppointmentColor>(
            `/v1/appointment-colors/${id}/default`
        );
        return response.data;
    },

    clearDefault: async (): Promise<void> => {
        await apiClient.delete('/v1/appointment-colors/default');
    },

    /** Archiwalny kolor znika z list wyboru, ale wizyty zachowują swoje oznaczenie. */
    setArchived: async (id: string, archived: boolean): Promise<AppointmentColor> => {
        const response = await apiClient.post<AppointmentColor>(
            `/v1/appointment-colors/${id}/${archived ? 'archive' : 'restore'}`
        );
        return response.data;
    },
};
