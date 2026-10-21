// src/modules/customers/api/customerDetailApi.ts

import { putToPresignedUrl } from '@/common/utils/presignedUpload';
import { apiClient } from '@/core/apiClient';
import type {
    CustomerDetailData,
    CustomerVisitsResponse,
    UpdateConsentPayload,
    AddVehiclePayload,
    Vehicle,
    MarketingConsent,
    CustomerReservationsResponse,
    CustomerCommunicationResponse,
    CustomerConsentsStatusResponse,
    SignCustomerConsentPayload,
    SignCustomerConsentResult,
} from '../types';
import { mapBackendReservationsResponse, mapCalendarVisitsToCustomerVisitsResponse, type BackendVehicle as CustomerVehicleRow } from '../utils/customerMappers';
import type { VisitResponse } from '@/modules/calendar/types';

const CUSTOMERS_BASE_PATH = '/v1/customers';

// ─── Revenue summary ──────────────────────────────────────────────────────────

export interface RevenueBucket {
    year: number;
    month: number;
    grossAmount: number;
    currency: string;
    visitCount: number;
}

export interface RevenueSummary {
    buckets: RevenueBucket[];
    total: {
        grossAmount: number;
        netAmount: number;
        currency: string;
        visitCount: number;
    };
    period: {
        from: string;
        to: string;
    };
}

// Backend appointment/reservation response type
interface BackendAppointment {
    id: string;
    customerId: string;
    vehicle: {
        brand: string;
        model: string;
        year: number;
        licensePlate: string;
    } | null;
    schedule: {
        isAllDay: boolean;
        startDateTime: string;
        endDateTime: string;
    };
    status: string;
    totalNet: number;
    totalGross: number;
    totalVat: number;
    createdAt: string;
    updatedAt: string;
}

export const customerDetailApi = {
    getCustomerDetail: async (customerId: string): Promise<CustomerDetailData> => {
        const response = await apiClient.get<CustomerDetailData>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/detail`
        );
        const raw = response.data;
        // lifetimeValue = null bez prawa do cen (serwer nie wysyła obrotów).
        return {
            ...raw,
            lifetimeValue: raw.lifetimeValue ? { ...raw.lifetimeValue } : null,
        };
    },

    /**
     * Surowa lista - kartoteka mapuje ją przez `select`, a przyjęcie i rezerwacja biorą
     * wprost. Dzięki temu obie strony dzielą jeden wpis w cache (customerVehiclesQuery).
     */
    getCustomerVehicles: async (customerId: string, includeDeleted = false): Promise<CustomerVehicleRow[]> => {
        const response = await apiClient.get<CustomerVehicleRow[]>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/vehicles`,
            { params: includeDeleted ? { includeDeleted: true } : undefined }
        );
        return response.data;
    },

    getCustomerActiveData: async (customerId: string): Promise<{ visits: CustomerVisitsResponse; reservations: CustomerReservationsResponse }> => {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 5);
        const endDate = new Date(now);
        endDate.setFullYear(endDate.getFullYear() + 1);

        const response = await apiClient.get<{ appointments: BackendAppointment[]; visits: VisitResponse[] }>(
            '/v1/calendar/events',
            {
                params: {
                    customerId,
                    visitStatuses: 'IN_PROGRESS,READY_FOR_PICKUP,COMPLETED,REJECTED,ARCHIVED',
                    appointmentStatuses: 'ABANDONED,CREATED',
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                },
            }
        );

        return {
            visits: mapCalendarVisitsToCustomerVisitsResponse(response.data.visits ?? []),
            reservations: mapBackendReservationsResponse(response.data.appointments ?? []),
        };
    },

    getCustomerDeletedVisits: async (customerId: string): Promise<CustomerVisitsResponse> => {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 5);
        const endDate = new Date(now);
        endDate.setFullYear(endDate.getFullYear() + 1);

        const response = await apiClient.get<{ visits: VisitResponse[] }>(
            '/v1/calendar/events',
            {
                params: {
                    customerId,
                    visitStatuses: 'IN_PROGRESS,READY_FOR_PICKUP,COMPLETED,REJECTED,ARCHIVED',
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    includeDeleted: true,
                },
            }
        );

        return mapCalendarVisitsToCustomerVisitsResponse(response.data.visits ?? []);
    },

    getRevenueSummary: async (customerId: string, months = 12): Promise<RevenueSummary> => {
        const response = await apiClient.get<RevenueSummary>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/revenue-summary`,
            { params: { months } },
        );
        const raw = response.data;
        return {
            ...raw,
            buckets: raw.buckets.map(b => ({ ...b, grossAmount: b.grossAmount / 100 })),
            total: { ...raw.total, grossAmount: raw.total.grossAmount / 100, netAmount: raw.total.netAmount / 100 },
        };
    },

    updateConsent: async (
        customerId: string,
        payload: UpdateConsentPayload
    ): Promise<MarketingConsent> => {
        const response = await apiClient.patch<MarketingConsent>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/consents/${payload.consentId}`,
            { granted: payload.granted }
        );
        return response.data;
    },

    addVehicle: async (customerId: string, payload: AddVehiclePayload): Promise<Vehicle> => {
        const response = await apiClient.post<Vehicle>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/vehicles`,
            payload
        );
        return response.data;
    },

    getCustomerCommunication: async (customerId: string): Promise<CustomerCommunicationResponse> => {
        const response = await apiClient.get<CustomerCommunicationResponse>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/communication`
        );
        return response.data;
    },

    getCustomerConsentsStatus: async (customerId: string): Promise<CustomerConsentsStatusResponse> => {
        const response = await apiClient.get<CustomerConsentsStatusResponse>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/consents`
        );
        return response.data;
    },

    signCustomerConsent: async (
        customerId: string,
        templateId: string,
        payload: SignCustomerConsentPayload = {}
    ): Promise<SignCustomerConsentResult> => {
        const response = await apiClient.post<SignCustomerConsentResult>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/consents/${templateId}/sign`,
            payload
        );
        return response.data;
    },

    revokeCustomerConsent: async (customerId: string, consentId: string): Promise<void> => {
        await apiClient.delete(
            `${CUSTOMERS_BASE_PATH}/${customerId}/consents/${consentId}`
        );
    },

    /**
     * `contentType` musi być tym samym, który poszedł w `attachmentContentType` przy
     * podpisaniu zgody - serwer podpisał adres pod ten rodzaj pliku. Wcześniej każdy skan
     * leciał jako `application/pdf`, więc zdjęcie z telefonu S3 odrzucał, a odrzucenia
     * nikt nie sprawdzał.
     */
    uploadConsentAttachment: async (uploadUrl: string, file: File, contentType: string): Promise<void> => {
        await putToPresignedUrl(uploadUrl, file, contentType);
    },
};
