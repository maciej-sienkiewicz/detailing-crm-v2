import { apiClient } from '@/core';
import type {
    BatchContractor,
    BatchOrderEntry,
    ContractorsResponse,
    ContractorEntriesResponse,
    ContractorRequest,
    EntryRequest,
    EntrySummary,
    VehicleSuggestion,
} from '../types';

const BASE = '/batch-orders';

export const batchOrderApi = {
    listContractors: async (): Promise<BatchContractor[]> => {
        const response = await apiClient.get<ContractorsResponse>(`${BASE}/contractors`);
        return response.data.contractors;
    },

    createContractor: async (data: ContractorRequest): Promise<BatchContractor> => {
        const response = await apiClient.post<{ contractor: BatchContractor }>(`${BASE}/contractors`, data);
        return response.data.contractor;
    },

    updateContractor: async (contractorId: string, data: ContractorRequest): Promise<BatchContractor> => {
        const response = await apiClient.put<{ contractor: BatchContractor }>(`${BASE}/contractors/${contractorId}`, data);
        return response.data.contractor;
    },

    deleteContractor: async (contractorId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/contractors/${contractorId}`);
    },

    getContractorEntries: async (contractorId: string, from?: string, to?: string): Promise<ContractorEntriesResponse> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        const query = params.toString() ? `?${params}` : '';
        const response = await apiClient.get<ContractorEntriesResponse>(`${BASE}/contractors/${contractorId}/entries${query}`);
        return response.data;
    },

    createEntry: async (contractorId: string, data: EntryRequest): Promise<BatchOrderEntry> => {
        const response = await apiClient.post<{ entry: BatchOrderEntry }>(`${BASE}/contractors/${contractorId}/entries`, data);
        return response.data.entry;
    },

    updateEntry: async (entryId: string, data: EntryRequest): Promise<BatchOrderEntry> => {
        const response = await apiClient.put<{ entry: BatchOrderEntry }>(`${BASE}/entries/${entryId}`, data);
        return response.data.entry;
    },

    deleteEntry: async (entryId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/entries/${entryId}`);
    },

    searchVehicles: async (q: string): Promise<VehicleSuggestion[]> => {
        if (q.trim().length < 2) return [];
        const response = await apiClient.get<VehicleSuggestion[]>(`${BASE}/vehicles/search`, { params: { q } });
        return response.data;
    },

    downloadReport: async (contractorId: string, contractorName: string, from?: string, to?: string): Promise<void> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        const query = params.toString() ? `?${params}` : '';
        const response = await apiClient.get(`${BASE}/contractors/${contractorId}/report${query}`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `zestawienie-${contractorName.replace(/\s+/g, '-')}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
    },
};
