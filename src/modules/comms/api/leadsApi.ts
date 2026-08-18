// src/modules/comms/api/leadsApi.ts
import { apiClient } from '@/core/apiClient';
import type {
    Lead,
    LeadAnalytics,
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
};
