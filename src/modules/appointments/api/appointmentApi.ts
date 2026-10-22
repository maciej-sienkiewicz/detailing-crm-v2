import { apiClient } from '@/core';
import { fetchWholeCatalog } from '@/modules/services/api/fetchWholeCatalog';
import type {
    AppointmentCreateRequest,
    Service, Customer, Vehicle, AppointmentColor, AppointmentSmsInfo,
    RecurrenceEditScope, CreateRecurringAppointmentResponse, RecurrenceSeriesResponse,
    SeriesEditScope, SeriesEditImpact, AppointmentUpdateResponse,
} from '../types';
import type { Customer as CustomerFull, CustomerListResponse } from '@/modules/customers/types';

export const appointmentApi = {
    createAppointment: async (data: AppointmentCreateRequest): Promise<{ id: string }> => {
        const response = await apiClient.post('/v1/appointments', data);
        return response.data;
    },

    /**
     * Zapis jednej rezerwacji - BEZ parametru `scope`. Serwer traktuje jego brak jako
     * „tylko ta" i odłącza rezerwację od serii; inne rezerwacje serii zostają bez zmian.
     */
    updateAppointment: async (appointmentId: string, data: AppointmentCreateRequest): Promise<AppointmentUpdateResponse> => {
        const response = await apiClient.put(`/v1/appointments/${appointmentId}`, data);
        return response.data;
    },

    getServices: async (): Promise<Service[]> => {
        return fetchWholeCatalog<Service>();
    },

    searchCustomers: async (query: string): Promise<Customer[]> => {
        const response = await apiClient.get<CustomerListResponse>('/v1/customers', {
            params: {
                search: query,
                page: 1,
                limit: 50
            }
        });

        // Mapuj pełny Customer z backendu na prosty Customer dla appointments
        return response.data.data.map((customer: CustomerFull) => ({
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.contact.phone,
            email: customer.contact.email,
        }));
    },

    getCustomerVehicles: async (customerId: string): Promise<Vehicle[]> => {
        const response = await apiClient.get(`/v1/customers/${customerId}/vehicles`);
        return response.data;
    },

    getAppointmentColors: async (): Promise<AppointmentColor[]> => {
        const response = await apiClient.get<{ colors: AppointmentColor[] }>('/v1/appointment-colors');
        return response.data.colors;
    },

    getAppointment: async (appointmentId: string) => {
        const response = await apiClient.get(`/v1/appointments/${appointmentId}`);
        return response.data;
    },

    updateTitle: async (appointmentId: string, title: string): Promise<void> => {
        await apiClient.patch(`/v1/appointments/${appointmentId}/title`, { title });
    },

    updateSmsPreferences: async (appointmentId: string, sendReminderSms: boolean): Promise<void> => {
        await apiClient.patch(`/v1/appointments/${appointmentId}/sms-preferences`, { sendReminderSms });
    },

    getSmsInfo: async (appointmentId: string): Promise<AppointmentSmsInfo> => {
        const response = await apiClient.get(`/v1/appointments/${appointmentId}`);
        return response.data.smsInfo;
    },

    createRecurringAppointment: async (
        data: AppointmentCreateRequest & { recurrence: NonNullable<AppointmentCreateRequest['recurrence']> }
    ): Promise<CreateRecurringAppointmentResponse> => {
        const response = await apiClient.post('/v1/appointments/recurring', data);
        return response.data;
    },

    /**
     * Zapis z nadpisaniem innych rezerwacji serii - wyłącznie z okna „Zapisz w serii",
     * w którym operator sam wybrał zakres. Typ nie przyjmuje THIS: pojedyncza edycja
     * idzie przez [updateAppointment] bez żadnego zakresu.
     */
    updateAppointmentWithScope: async (
        appointmentId: string,
        data: AppointmentCreateRequest,
        scope: SeriesEditScope
    ): Promise<AppointmentUpdateResponse> => {
        const response = await apiClient.put(
            `/v1/appointments/${appointmentId}`,
            data,
            { params: { scope } }
        );
        return response.data;
    },

    getSeriesEditImpact: async (appointmentId: string): Promise<SeriesEditImpact> => {
        const response = await apiClient.get(`/v1/appointments/${appointmentId}/series-impact`);
        return response.data;
    },

    deleteAppointmentWithScope: async (
        appointmentId: string,
        scope: RecurrenceEditScope
    ): Promise<void> => {
        await apiClient.delete(`/v1/appointments/${appointmentId}?scope=${scope}`);
    },

    getRecurrenceSeries: async (seriesId: string): Promise<RecurrenceSeriesResponse> => {
        const response = await apiClient.get(`/v1/appointments/series/${seriesId}`);
        return response.data;
    },
};
