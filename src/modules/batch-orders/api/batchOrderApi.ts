import { apiClient } from '@/core';
import type {
    BatchContractor,
    BatchOrderEntry,
    BatchOrderPhoto,
    BatchService,
    BatchServiceRequest,
    ContractorsResponse,
    ContractorEntriesResponse,
    ContractorRequest,
    EntryRequest,
    PhotoUploadRequest,
    PhotoUploadResponse,
    SettlementHistoryRecord,
    SettlementRequest,
    SettlementResult,
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

    getContractorEntries: async (
        contractorId: string,
        from?: string,
        to?: string,
        includeSettled = false,
    ): Promise<ContractorEntriesResponse> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        // Only sent when on: the backend defaults to hiding settled entries, and an
        // explicit `false` on every request would make the default meaningless.
        if (includeSettled) params.append('includeSettled', 'true');
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

    searchVehiclesFromEntries: async (q: string): Promise<VehicleSuggestion[]> => {
        if (q.trim().length < 2) return [];
        const response = await apiClient.get<VehicleSuggestion[]>(`${BASE}/vehicles/search-entry`, { params: { q } });
        return response.data;
    },

    listEntryPhotos: async (entryId: string): Promise<BatchOrderPhoto[]> => {
        const response = await apiClient.get<{ photos: BatchOrderPhoto[] }>(`${BASE}/entries/${entryId}/photos`);
        return response.data.photos;
    },

    requestPhotoUploadUrl: async (entryId: string, data: PhotoUploadRequest): Promise<PhotoUploadResponse> => {
        const response = await apiClient.post<PhotoUploadResponse>(`${BASE}/entries/${entryId}/photos/upload-url`, data);
        return response.data;
    },

    uploadPhotoToS3: async (uploadUrl: string, file: File): Promise<void> => {
        await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'image/jpeg' },
        });
    },

    deleteEntryPhoto: async (entryId: string, photoId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/entries/${entryId}/photos/${photoId}`);
    },

    extractVin: async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await apiClient.post<{ vin: string | null }>(`${BASE}/vin/extract`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.vin;
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

    settle: async (contractorId: string, request: SettlementRequest): Promise<SettlementResult> => {
        const response = await apiClient.post<SettlementResult>(`${BASE}/contractors/${contractorId}/close-month`, request);
        return response.data;
    },

    getSettlementHistory: async (contractorId: string): Promise<SettlementHistoryRecord[]> => {
        const response = await apiClient.get<{ records: SettlementHistoryRecord[] }>(
            `${BASE}/contractors/${contractorId}/close-history`
        );
        return response.data.records;
    },

    // ── Service catalog ──────────────────────────────────────────────────────

    listServices: async (q?: string): Promise<BatchService[]> => {
        const response = await apiClient.get<{ services: BatchService[] }>(`${BASE}/services`, {
            params: q ? { q } : undefined,
        });
        return response.data.services;
    },

    createService: async (data: BatchServiceRequest): Promise<BatchService> => {
        const response = await apiClient.post<{ service: BatchService }>(`${BASE}/services`, data);
        return response.data.service;
    },

    updateService: async (serviceId: string, data: BatchServiceRequest): Promise<BatchService> => {
        const response = await apiClient.put<{ service: BatchService }>(`${BASE}/services/${serviceId}`, data);
        return response.data.service;
    },

    deleteService: async (serviceId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/services/${serviceId}`);
    },

    downloadHistorySnapshot: async (historyId: string, contractorName: string): Promise<void> => {
        const response = await apiClient.get(`${BASE}/close-history/${historyId}/snapshot`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `rozliczenie-${contractorName.replace(/\s+/g, '-')}-${historyId.slice(0, 8)}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
    },
};
