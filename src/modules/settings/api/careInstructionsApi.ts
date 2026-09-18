// src/modules/settings/api/careInstructionsApi.ts
//
// Słownik instrukcji pielęgnacyjnych drukowanych na certyfikacie jakości.
// Konfigurowany w Ustawieniach → Cennik usług → Instrukcje pielęgnacji, przypisywany
// do pozycji cennika i zaznaczany przy generowaniu certyfikatu.
import { apiClient } from '@/core';

export interface CareInstruction {
    id: string;
    title: string;
    content: string;
    /** Zaznaczaj przy każdym certyfikacie — zasady prawdziwe niezależnie od usługi. */
    isDefaultSelected: boolean;
    sortOrder: number;
    /** Usługi z cennika, które zaznaczają tę instrukcję automatycznie. */
    serviceIds: string[];
}

export interface SaveCareInstructionRequest {
    title: string;
    content: string;
    isDefaultSelected: boolean;
}

const BASE = '/v1/care-instructions';

export const careInstructionsApi = {
    list: async (): Promise<CareInstruction[]> => {
        const { data } = await apiClient.get(BASE);
        return data;
    },
    create: async (req: SaveCareInstructionRequest): Promise<CareInstruction> => {
        const { data } = await apiClient.post(BASE, req);
        return data;
    },
    update: async (id: string, req: SaveCareInstructionRequest): Promise<CareInstruction> => {
        const { data } = await apiClient.patch(`${BASE}/${id}`, req);
        return data;
    },
    remove: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${id}`);
    },
    /** Podmienia KOMPLET instrukcji przypisanych do usługi; zwraca odświeżony słownik. */
    setForService: async (serviceId: string, instructionIds: string[]): Promise<CareInstruction[]> => {
        const { data } = await apiClient.put(`${BASE}/services/${serviceId}`, { instructionIds });
        return data;
    },
};
