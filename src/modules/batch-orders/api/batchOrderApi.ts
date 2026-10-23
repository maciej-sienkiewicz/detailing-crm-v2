import { photoUploadContentType, putToPresignedUrl } from '@/common/utils/presignedUpload';
import { saveBlobAsFile } from '@/common/utils/blobFile';
import { fileNameFromDisposition } from '@/core/native/nativeFiles';
import { apiClient } from '@/core';
import type {
    ArchivedContractor,
    BatchContractor,
    BatchOrderEntry,
    BatchOrderPhoto,
    BatchService,
    BatchServiceRequest,
    ContractorsResponse,
    ContractorEntriesResponse,
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

const BASE = '/v1/batch-orders';

/**
 * Każde wywołanie, którego błąd moduł pokazuje sam (baner w oknie, tekst pod polem,
 * własny komunikat z tytułem). Bez tego globalny przechwytywacz dokładał ten sam tekst
 * drugi raz, w czerwonym komunikacie w rogu.
 */
const HANDLED = { skipErrorToast: true } as const;

/** Nazwa pliku z nagłówka serwera (niesie numer zestawienia), a gdy go brak - zapasowa. */
function savePdf(response: { data: BlobPart; headers: Record<string, unknown> }, fallbackName: string) {
    const header = response.headers['content-disposition'];
    const name = fileNameFromDisposition(typeof header === 'string' ? header : null) ?? fallbackName;
    saveBlobAsFile(new Blob([response.data], { type: 'application/pdf' }), name);
}

export const batchOrderApi = {
    listContractors: async (): Promise<BatchContractor[]> => {
        const response = await apiClient.get<ContractorsResponse>(`${BASE}/contractors`);
        return response.data.contractors;
    },

    createContractor: async (data: ContractorRequest): Promise<BatchContractor> => {
        const response = await apiClient.post<{ contractor: BatchContractor }>(`${BASE}/contractors`, data, HANDLED);
        return response.data.contractor;
    },

    updateContractor: async (contractorId: string, data: ContractorRequest): Promise<BatchContractor> => {
        const response = await apiClient.put<{ contractor: BatchContractor }>(`${BASE}/contractors/${contractorId}`, data, HANDLED);
        return response.data.contractor;
    },

    /** Przeniesienie do archiwum: kontrahent znika z listy, jego auta i zestawienia zostają. */
    deleteContractor: async (contractorId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/contractors/${contractorId}`, HANDLED);
    },

    listArchivedContractors: async (): Promise<ArchivedContractor[]> => {
        const response = await apiClient.get<{ contractors: ArchivedContractor[] }>(`${BASE}/contractors/archive`);
        return response.data.contractors;
    },

    restoreContractor: async (contractorId: string): Promise<BatchContractor> => {
        const response = await apiClient.post<{ contractor: BatchContractor }>(
            `${BASE}/contractors/${contractorId}/restore`, undefined, HANDLED,
        );
        return response.data.contractor;
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
        const response = await apiClient.post<{ entry: BatchOrderEntry }>(`${BASE}/contractors/${contractorId}/entries`, data, HANDLED);
        return response.data.entry;
    },

    updateEntry: async (entryId: string, data: EntryRequest): Promise<BatchOrderEntry> => {
        const response = await apiClient.put<{ entry: BatchOrderEntry }>(`${BASE}/entries/${entryId}`, data, HANDLED);
        return response.data.entry;
    },

    /**
     * Poprawka rozliczonego auta: odblokowanie do korekty i nowa treść w jednym kroku.
     * Bez zmian w treści serwer odpowiada 400, a auto zostaje rozliczone - dawniej samo
     * otwarcie rozliczonego auta (POST /reopen) zostawiało korektę, nawet gdy nic nie zmieniono.
     */
    correctEntry: async (entryId: string, data: EntryRequest): Promise<BatchOrderEntry> => {
        const response = await apiClient.put<{ entry: BatchOrderEntry }>(`${BASE}/entries/${entryId}/correction`, data, HANDLED);
        return response.data.entry;
    },

    deleteEntry: async (entryId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/entries/${entryId}`, HANDLED);
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
        const response = await apiClient.post<PhotoUploadResponse>(`${BASE}/entries/${entryId}/photos/upload-url`, data, HANDLED);
        return response.data;
    },

    uploadPhotoToS3: async (uploadUrl: string, file: File): Promise<void> => {
        // fetch nie rzuca przy 4xx/5xx - putToPresignedUrl tak. Bez tego odrzucony upload
        // wyglądał jak udany: miniatura znikała, a zdjęcia w dokumentacji nie było.
        // Nagłówek to ten, który podpisał serwer (z rozszerzenia nazwy, jak
        // AddBatchOrderPhotoHandler), nie `file.type` - inaczej .heic czy .gif dostawały 403.
        await putToPresignedUrl(uploadUrl, file, photoUploadContentType(file.name));
    },

    deleteEntryPhoto: async (entryId: string, photoId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/entries/${entryId}/photos/${photoId}`, HANDLED);
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
            ...HANDLED,
        });
        savePdf(response, `zestawienie-${contractorName.replace(/\s+/g, '-')}.pdf`);
    },

    settle: async (contractorId: string, request: SettlementRequest): Promise<SettlementResult> => {
        const response = await apiClient.post<SettlementResult>(`${BASE}/contractors/${contractorId}/close-month`, request, HANDLED);
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
        const response = await apiClient.post<{ service: BatchService }>(`${BASE}/services`, data, HANDLED);
        return response.data.service;
    },

    updateService: async (serviceId: string, data: BatchServiceRequest): Promise<BatchService> => {
        const response = await apiClient.put<{ service: BatchService }>(`${BASE}/services/${serviceId}`, data, HANDLED);
        return response.data.service;
    },

    deleteService: async (serviceId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/services/${serviceId}`, HANDLED);
    },

    downloadHistorySnapshot: async (historyId: string, contractorName: string): Promise<void> => {
        const response = await apiClient.get(`${BASE}/close-history/${historyId}/snapshot`, {
            responseType: 'blob',
            ...HANDLED,
        });
        savePdf(response, `zestawienie-${contractorName.replace(/\s+/g, '-')}-${historyId.slice(0, 8)}.pdf`);
    },
};
