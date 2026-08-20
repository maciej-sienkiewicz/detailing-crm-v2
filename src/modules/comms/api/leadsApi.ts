// src/modules/comms/api/leadsApi.ts
import { apiClient } from '@/core/apiClient';
import type {
    CreatedLeadIntakeWebhook,
    Lead,
    LeadAnalytics,
    DictionaryEntry,
    LeadIntakeDelivery,
    LeadIntakeWebhook,
    LeadDictionaries,
    LeadPage,
    LeadServiceItemInput,
    LeadStatus,
    LeadStatusHistoryEntry,
    MarkThreadAsLeadRequest,
} from '../types';

export const leadsApi = {
    getLeads: async (filters: {
        status?: LeadStatus;
        query?: string;
        page?: number;
        pageSize?: number;
    }): Promise<LeadPage> => {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.query) params.set('query', filters.query);
        params.set('page', String(filters.page ?? 0));
        params.set('pageSize', String(filters.pageSize ?? 25));
        const { data } = await apiClient.get(`/v1/leads?${params}`);
        return data;
    },

    getLead: async (leadId: string): Promise<Lead> => {
        const { data } = await apiClient.get(`/v1/leads/${leadId}`);
        return data;
    },

    getHistory: async (leadId: string): Promise<LeadStatusHistoryEntry[]> => {
        const { data } = await apiClient.get(`/v1/leads/${leadId}/history`);
        return data;
    },

    getDictionaries: async (): Promise<LeadDictionaries> => {
        const { data } = await apiClient.get('/v1/leads/dictionaries');
        return data;
    },

    getAnalytics: async (from?: string, to?: string): Promise<LeadAnalytics> => {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const { data } = await apiClient.get(`/v1/leads/analytics?${params}`);
        return data;
    },

    createLead: async (request: {
        contactIdentifier: string;
        customerName?: string;
        initialMessage?: string;
        category?: string;
    }): Promise<Lead> => {
        const { data } = await apiClient.post('/v1/leads', request);
        return data;
    },

    markThreadAsLead: async (
        threadId: string,
        request: MarkThreadAsLeadRequest
    ): Promise<{ leadId: string; estimatedValue: number }> => {
        const { data } = await apiClient.post(`/v1/leads/from-thread/${threadId}`, request, {
            skipErrorToast: true,
        });
        return data;
    },

    changeStatus: async (
        leadId: string,
        request: { status: LeadStatus; lostReasonCode?: string; lostNote?: string }
    ): Promise<Lead> => {
        const { data } = await apiClient.put(`/v1/leads/${leadId}/status`, request, {
            skipErrorToast: true,
        });
        return data;
    },

    updateServices: async (leadId: string, services: LeadServiceItemInput[]): Promise<Lead> => {
        const { data } = await apiClient.put(`/v1/leads/${leadId}/services`, { services });
        return data;
    },

    updateVehicle: async (
        leadId: string,
        vehicleBrand: string | null,
        vehicleModel: string | null
    ): Promise<Lead> => {
        const { data } = await apiClient.put(`/v1/leads/${leadId}/vehicle`, { vehicleBrand, vehicleModel });
        return data;
    },

    updateLead: async (
        leadId: string,
        request: { category?: string; customerName?: string; assignedUserId?: string }
    ): Promise<Lead> => {
        const { data } = await apiClient.put(`/v1/leads/${leadId}`, request);
        return data;
    },

    assignCustomer: async (leadId: string, customerId: string): Promise<Lead> => {
        const { data } = await apiClient.put(`/v1/leads/${leadId}/customer`, { customerId });
        return data;
    },

    updateTags: async (leadId: string, tags: string[]): Promise<Lead> => {
        const { data } = await apiClient.put(`/v1/leads/${leadId}/tags`, { tags }, {
            skipErrorToast: true,
        });
        return data;
    },

    deleteLead: async (leadId: string): Promise<void> => {
        await apiClient.delete(`/v1/leads/${leadId}`, { skipErrorToast: true });
    },

    // ── Webhooki formularzy ──────────────────────────────────────────────────

    getIntakeWebhooks: async (): Promise<LeadIntakeWebhook[]> => {
        const { data } = await apiClient.get('/v1/leads/intake-webhooks');
        return data;
    },

    createIntakeWebhook: async (
        name: string,
        defaultTagCodes: string[]
    ): Promise<CreatedLeadIntakeWebhook> => {
        const { data } = await apiClient.post(
            '/v1/leads/intake-webhooks',
            { name, defaultTagCodes },
            { skipErrorToast: true }
        );
        return data;
    },

    updateIntakeWebhook: async (
        id: string,
        request: { name?: string; active?: boolean; fieldMapping?: string; defaultTagCodes?: string[] }
    ): Promise<LeadIntakeWebhook> => {
        const { data } = await apiClient.put(`/v1/leads/intake-webhooks/${id}`, request, {
            skipErrorToast: true,
        });
        return data;
    },

    deleteIntakeWebhook: async (id: string): Promise<void> => {
        await apiClient.delete(`/v1/leads/intake-webhooks/${id}`, { skipErrorToast: true });
    },

    getIntakeDeliveries: async (id: string): Promise<LeadIntakeDelivery[]> => {
        const { data } = await apiClient.get(`/v1/leads/intake-webhooks/${id}/deliveries`);
        return data;
    },

    createTag: async (label: string): Promise<DictionaryEntry> => {
        const { data } = await apiClient.post('/v1/leads/tags', { label }, { skipErrorToast: true });
        return data;
    },

    deleteTag: async (code: string): Promise<void> => {
        await apiClient.delete(`/v1/leads/tags/${encodeURIComponent(code)}`, { skipErrorToast: true });
    },
};
