// src/modules/appointment-colors/api/appointmentColorApi.ts
import { apiClient } from '@/core';
import type {
    AppointmentColor,
    AppointmentColorCreateRequest,
    AppointmentColorUpdateRequest,
    AppointmentColorListResponse,
    AppointmentColorFilters,
} from '../types';

export const appointmentColorApi = {
    getColors: async (filters: AppointmentColorFilters): Promise<AppointmentColorListResponse> => {
        const params: Record<string, string | number | boolean> = {
            page: filters.page || 1,
            limit: filters.limit || 50,
        };

        if (filters.search) {
            params.search = filters.search;
        }

        if (filters.showInactive !== undefined) {
            params.showInactive = filters.showInactive;
        }

        const response = await apiClient.get<AppointmentColorListResponse>(
            '/api/v1/appointment-colors',
            { params }
        );
        return response.data;
    },

    getColorById: async (id: string): Promise<AppointmentColor> => {
        const response = await apiClient.get<AppointmentColor>(`/api/v1/appointment-colors/${id}`);
        return response.data;
    },

    createColor: async (data: AppointmentColorCreateRequest): Promise<AppointmentColor> => {
        const response = await apiClient.post<AppointmentColor>('/api/v1/appointment-colors', data);
        return response.data;
    },

    updateColor: async (id: string, data: AppointmentColorUpdateRequest): Promise<AppointmentColor> => {
        const response = await apiClient.put<AppointmentColor>(
            `/api/v1/appointment-colors/${id}`,
            data
        );
        return response.data;
    },

    deleteColor: async (id: string): Promise<void> => {
        await apiClient.delete(`/api/v1/appointment-colors/${id}`);
    },
};
