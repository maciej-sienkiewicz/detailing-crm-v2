// src/modules/visits/api/visitCostsApi.ts
//
// Koszty i zysk wizyty: dokumenty z zakładki „Dokumenty kosztowe" (faktury z KSeF
// i koszty dodane ręcznie) przypięte do wizyty. Przypięcie niczego nie zmienia
// w finansach - zmienia tylko rachunek zysku tej wizyty.
//
// Kwoty w GROSZACH, jak w pozycjach wizyty (nie w złotych jak /v1/ksef/expenses).

import { apiClient } from '@/core';
import type { CostDocumentKind } from '@/modules/finance/types';

/** Dlaczego przypięty dokument nie wchodzi do sumy kosztów. */
export type CostExclusion = 'HIDDEN' | 'CANCELLED' | 'FOREIGN_CURRENCY';

/**
 * Skąd jest przychód: SETTLED - pojazd wydany, ESTIMATE - wizyta trwa (bieżąca wycena),
 * NONE - wizyta odrzucona, przychodu nie ma.
 */
export type RevenueBasis = 'SETTLED' | 'ESTIMATE' | 'NONE';

export interface CostDocument {
    id: string;
    source: 'KSEF' | 'MANUAL';
    documentKind: CostDocumentKind;
    documentNumber: string | null;
    ksefNumber: string | null;
    saleDate: string | null;
    sellerName: string | null;
    sellerNip: string | null;
    /** null = dokument bez kwoty (niepełne metadane KSeF). W walucie dokumentu. */
    netAmount: number | null;
    grossAmount: number | null;
    currency: string;
    status: 'ACTIVE' | 'CORRECTED' | 'CANCELLED' | 'EXCLUDED';
    isCorrection: boolean;
    paymentStatus: 'PAID' | 'PENDING';
    /** Czy dokument wchodzi do sumy kosztów wizyty. */
    counted: boolean;
    exclusion: CostExclusion | null;
}

export interface LinkedCostDocument {
    document: CostDocument;
    linkedAt: string;
    linkedByName: string | null;
}

export interface VisitCosts {
    visitId: string;
    visitStatus: string;
    revenueBasis: RevenueBasis;
    revenueNet: number;
    revenueGross: number;
    costNet: number;
    costGross: number;
    profitNet: number;
    /** Marża netto w %, jedno miejsce po przecinku; null bez przychodu. */
    marginPercent: number | null;
    countedDocuments: number;
    documents: LinkedCostDocument[];
}

export interface CostDocumentLinkedVisit {
    visitId: string;
    visitNumber: string;
    /** Tytuł wizyty albo auto. */
    label: string;
    deleted: boolean;
    /** Dokument jest już przypięty do wizyty, z której pytamy. */
    current: boolean;
}

export interface CostDocumentCandidate {
    document: CostDocument;
    linkedVisit: CostDocumentLinkedVisit | null;
}

export interface CostDocumentCandidates {
    candidates: CostDocumentCandidate[];
    /** Ile dokumentów pasuje; lista niesie najwyżej 50 najnowszych. */
    total: number;
    /** Okres podpowiedzi bez wyszukiwania (wokół dat wizyty); null przy wyszukiwaniu. */
    periodFrom: string | null;
    periodTo: string | null;
}

export const visitCostsApi = {
    get: async (visitId: string): Promise<VisitCosts> => {
        const response = await apiClient.get<VisitCosts>(`/visits/${visitId}/costs`);
        return response.data;
    },

    candidates: async (visitId: string, search: string): Promise<CostDocumentCandidates> => {
        const params = search.trim() ? { search: search.trim() } : undefined;
        const response = await apiClient.get<CostDocumentCandidates>(`/visits/${visitId}/costs/candidates`, { params });
        return response.data;
    },

    /**
     * Przypięcie. `reassign` przenosi dokument z innej wizyty - bez niego serwer odpowiada
     * 409 i dokument zostaje tam, gdzie był. Błąd pokazuje okno przypinania, stąd
     * `skipErrorToast`.
     */
    link: async (visitId: string, costDocumentId: string, reassign = false): Promise<VisitCosts> => {
        const response = await apiClient.put<VisitCosts>(
            `/visits/${visitId}/costs/${costDocumentId}`,
            { reassign },
            { skipErrorToast: true },
        );
        return response.data;
    },

    unlink: async (visitId: string, costDocumentId: string): Promise<VisitCosts> => {
        const response = await apiClient.delete<VisitCosts>(
            `/visits/${visitId}/costs/${costDocumentId}`,
            { skipErrorToast: true },
        );
        return response.data;
    },
};
