import { apiClient } from '@/core';
import type {
    BatchContractor,
    BatchOrderEntry,
    BatchOrderPhoto,
    BatchService,
    BatchServiceRequest,
    ContractorsResponse,
    ContractorEntriesResponse,
    ContractorOverview,
    EntryStatusFilter,
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

    /** Lista kontrahentów z tym, co każdy ma do rozliczenia w okresie - jedno zapytanie na całą listę. */
    getOverview: async (from?: string, to?: string): Promise<ContractorOverview[]> => {
        const response = await apiClient.get<{ contractors: ContractorOverview[] }>(
            `${BASE}/contractors/overview`,
            { params: { ...(from ? { from } : {}), ...(to ? { to } : {}) } },
        );
        return response.data.contractors;
    },

    getContractorEntries: async (
        contractorId: string,
        from?: string,
        to?: string,
        status: EntryStatusFilter = 'OPEN',
    ): Promise<ContractorEntriesResponse> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        params.append('status', status);
        const query = `?${params}`;
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

    /**
     * Odblokowuje rozliczony wpis do korekty. Rozliczonego wpisu nie da się zmienić
     * ani usunąć wprost - dawniej każdy zapis po cichu zdejmował z niego rozliczenie
     * i ta sama praca szła do kontrahenta drugi raz.
     */
    reopenEntry: async (entryId: string): Promise<BatchOrderEntry> => {
        const response = await apiClient.post<{ entry: BatchOrderEntry }>(`${BASE}/entries/${entryId}/reopen`);
        return response.data.entry;
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
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'image/jpeg' },
        });
        // fetch nie rzuca przy 4xx/5xx. Bez tej linijki odrzucony upload wyglądał jak
        // udany: miniatura znikała, a zdjęcia w dokumentacji nie było.
        if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
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

    downloadReport: async (
        contractorId: string,
        contractorName: string,
        from?: string,
        to?: string,
        status: EntryStatusFilter = 'ALL',
    ): Promise<void> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        params.append('status', status);
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
