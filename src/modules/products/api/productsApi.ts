// src/modules/products/api/productsApi.ts
import { apiClient } from '@/core';
import type {
    Product,
    ProductListFilters,
    ProductListResponse,
    CreateProductRequest,
    UpdateProductRequest,
    UpdateProductStudioRequest,
    ProductDraft,
    LookupResponse,
    ProductNote,
    ProductRating,
    VisitProductLink,
    ProductVisitUsagePage,
    ScanSession,
} from '../types';

const BASE = '/v1/products';

export const productsApi = {
    list: async (filters: ProductListFilters): Promise<ProductListResponse> => {
        const params = new URLSearchParams({
            search: filters.search,
            page: String(filters.page),
            limit: String(filters.limit),
            onlyFavourite: String(filters.onlyFavourite ?? false),
            includeHidden: String(filters.includeHidden ?? false),
            rating: filters.rating ?? '',
        });
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);
        const { data } = await apiClient.get(`${BASE}?${params}`);
        return data;
    },

    get: async (id: string): Promise<Product> => {
        const { data } = await apiClient.get(`${BASE}/${id}`);
        return data;
    },

    create: async (req: CreateProductRequest): Promise<Product> => {
        const { data } = await apiClient.post(BASE, req);
        return data;
    },

    createFromDraft: async (draft: ProductDraft): Promise<Product> => {
        const { data } = await apiClient.post(`${BASE}/from-draft`, draft);
        return data;
    },

    update: async (id: string, req: UpdateProductRequest): Promise<Product> => {
        // 202 (propozycja korekty dla wpisu zweryfikowanego) też wpada tutaj — caller
        // rozpoznaje ją po polu status w danych.
        const { data } = await apiClient.patch(`${BASE}/${id}`, req);
        return data;
    },

    updateStudio: async (id: string, req: UpdateProductStudioRequest): Promise<Product> => {
        const { data } = await apiClient.put(`${BASE}/${id}/studio`, req);
        return data;
    },

    lookup: async (barcode: string): Promise<LookupResponse> => {
        // Rozpoznanie bywa wolne (LLM + weryfikator) — nie chowamy błędu w globalnym toaście,
        // bo obsługujemy go w kroku formularza.
        const { data } = await apiClient.post(`${BASE}/lookup`, { barcode }, { skipErrorToast: true });
        return data;
    },

    /**
     * Odczyt cyfr kodu ZE ZDJĘCIA modelem wizyjnym — zapas, gdy dekoder w przeglądarce nie
     * odczyta kadru (wzorzec z `batchOrderApi.extractVin`). Zwraca sam GTIN; lookup woła caller.
     */
    extractBarcodeFromImage: async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append('image', file);
        const { data } = await apiClient.post<{ gtin: string | null }>(`${BASE}/barcode/extract`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            skipErrorToast: true,
        });
        return data.gtin;
    },

    // ── Notatki ──
    listNotes: async (id: string): Promise<ProductNote[]> => {
        const { data } = await apiClient.get(`${BASE}/${id}/notes`);
        return data;
    },
    addNote: async (id: string, content: string, visitId?: string): Promise<ProductNote> => {
        const { data } = await apiClient.post(`${BASE}/${id}/notes`, { content, visitId });
        return data;
    },
    editNote: async (id: string, noteId: string, content: string): Promise<ProductNote> => {
        const { data } = await apiClient.patch(`${BASE}/${id}/notes/${noteId}`, { content });
        return data;
    },
    deleteNote: async (id: string, noteId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${id}/notes/${noteId}`);
    },

    // ── Ocena ──
    setRating: async (id: string, rating: number, justification?: string): Promise<ProductRating> => {
        const { data } = await apiClient.put(`${BASE}/${id}/rating`, { rating, justification });
        return data;
    },
    clearRating: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${id}/rating`);
    },

    // ── Gdzie używaliśmy ──
    productVisits: async (
        id: string,
        params: { search: string; page: number; limit: number },
    ): Promise<ProductVisitUsagePage> => {
        const query = new URLSearchParams({
            search: params.search,
            page: String(params.page),
            limit: String(params.limit),
        });
        const { data } = await apiClient.get(`${BASE}/${id}/visits?${query}`);
        return data;
    },

    // ── Sesja skanowania (desktop) ──
    openScanSession: async (): Promise<ScanSession> => {
        const { data } = await apiClient.post(`${BASE}/scan-sessions`);
        return data;
    },
    getScanSession: async (sessionId: string): Promise<ScanSession> => {
        const { data } = await apiClient.get(`${BASE}/scan-sessions/${sessionId}`, { skipErrorToast: true });
        return data;
    },
    closeScanSession: async (sessionId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/scan-sessions/${sessionId}`);
    },
};

// ── Powiązania produktów z wizytą (pod /visits/{id}/products) ──
export const visitProductsApi = {
    list: async (visitId: string): Promise<VisitProductLink[]> => {
        const { data } = await apiClient.get(`/visits/${visitId}/products`);
        return data;
    },
    link: async (visitId: string, productId: string, note?: string): Promise<VisitProductLink> => {
        const { data } = await apiClient.post(`/visits/${visitId}/products`, { productId, note });
        return data;
    },
    updateNote: async (visitId: string, linkId: string, note: string | null): Promise<void> => {
        await apiClient.patch(`/visits/${visitId}/products/${linkId}`, { note });
    },
    unlink: async (visitId: string, linkId: string): Promise<void> => {
        await apiClient.delete(`/visits/${visitId}/products/${linkId}`);
    },
};

// ── Publiczna trasa telefonu (bez logowania, po tokenie handoffu) ──
export const mobileScanApi = {
    context: async (token: string): Promise<{ status: string; scannedCount: number; expiresAt: string }> => {
        const { data } = await apiClient.get(`/mobile/products/scan/${token}`, { skipAuthRedirect: true });
        return data;
    },
    submit: async (token: string, codes: string[]): Promise<{ status: string; scannedCount: number; expiresAt: string }> => {
        const { data } = await apiClient.post(`/mobile/products/scan/${token}`, { codes }, { skipAuthRedirect: true });
        return data;
    },
    /** Zapas: zdjęcie kodu → model wizyjny czyta cyfry → kod trafia do sesji jak przy skanie na żywo. */
    submitPhoto: async (token: string, file: File): Promise<{ gtin: string | null; status: string; scannedCount: number; expiresAt: string }> => {
        const formData = new FormData();
        formData.append('image', file);
        const { data } = await apiClient.post(`/mobile/products/scan/${token}/photo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            skipAuthRedirect: true,
            skipErrorToast: true,
        });
        return data;
    },
};
