import { apiClient } from '@/core';
import type {
    AppointmentCreateRequest,
    Customer,
    RecurrenceEditScope, CreateRecurringAppointmentResponse, RecurrenceSeriesResponse,
    SeriesEditScope, SeriesEditImpact, AppointmentUpdateResponse,
} from '../types';
import type { Customer as CustomerFull } from '@/modules/customers/types';
import type { Page } from '@/core/page';

export const appointmentApi = {
    createAppointment: async (data: AppointmentCreateRequest): Promise<{ id: string }> => {
        const response = await apiClient.post('/v1/appointments', data);
        return response.data;
    },

    /**
     * Zapis jednej rezerwacji - BEZ parametru `scope`. Serwer traktuje jego brak jako
     * „tylko ta" i odłącza rezerwację od serii; inne rezerwacje serii zostają bez zmian.
     */
    updateAppointment: async (
        appointmentId: string,
        data: AppointmentCreateRequest,
        /** Pole „Wyślij klientowi SMS o zmianie terminu"; undefined - serwer zostaje przy swoim. */
        notifyCustomer?: boolean,
    ): Promise<AppointmentUpdateResponse> => {
        const response = await apiClient.put(
            `/v1/appointments/${appointmentId}`,
            data,
            notifyCustomer === undefined ? undefined : { params: { notifyCustomer } },
        );
        return response.data;
    },

    searchCustomers: async (query: string, signal?: AbortSignal): Promise<Customer[]> => {
        const response = await apiClient.get<Page<CustomerFull>>('/v1/customers', {
            params: {
                search: query,
                page: 1,
                pageSize: 50
            },
            signal,
        });

        // Mapuj pełny Customer z backendu na prosty Customer dla appointments
        return response.data.items.map((customer: CustomerFull) => ({
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.contact.phone,
            email: customer.contact.email,
        }));
    },

    getAppointment: async (appointmentId: string, config?: { signal?: AbortSignal; skipErrorToast?: boolean }) => {
        const response = await apiClient.get(`/v1/appointments/${appointmentId}`, config);
        return response.data;
    },

    updateTitle: async (appointmentId: string, title: string): Promise<void> => {
        await apiClient.patch(`/v1/appointments/${appointmentId}/title`, { title });
    },

    updateSmsPreferences: async (appointmentId: string, sendReminderSms: boolean): Promise<void> => {
        await apiClient.patch(`/v1/appointments/${appointmentId}/sms-preferences`, { sendReminderSms });
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
