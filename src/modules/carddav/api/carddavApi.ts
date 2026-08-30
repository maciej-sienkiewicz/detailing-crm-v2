// src/modules/carddav/api/carddavApi.ts

import { apiClient } from '@/core/apiClient';
import type { CarddavAccountDto, CarddavProvisioningDto } from '../types';

// /v1/carddav/** to bezstanowy serwer CardDAV z Basic auth (tam loguje się
// telefon) — zarządzanie z sesji CRM żyje obok, pod /v1/carddav-setup.
const BASE_PATH = '/v1/carddav-setup';

/**
 * Kontakty studia na telefonie (CardDAV). Model bezpieczeństwa jak przy
 * urządzeniach push: każdy telefon dostaje WŁASNE hasło aplikacyjne, nigdy
 * hasło użytkownika. Odwołanie konta unieważnia te dane — telefon przestaje
 * się synchronizować, bez dotykania sesji użytkownika.
 */
export const carddavApi = {
    /**
     * Wybija jednorazowy link instalacyjny (ważny kilka minut, jedno pobranie).
     * Pod linkiem backend generuje i podpisuje profil .mobileconfig.
     */
    createProvisioning: async (params: { deviceName: string }): Promise<CarddavProvisioningDto> => {
        const { data } = await apiClient.post<CarddavProvisioningDto>(
            `${BASE_PATH}/provisionings`,
            params,
        );
        return data;
    },

    listAccounts: async (): Promise<CarddavAccountDto[]> => {
        const { data } = await apiClient.get<CarddavAccountDto[]>(`${BASE_PATH}/accounts`);
        return data;
    },

    revokeAccount: async (accountId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/accounts/${accountId}`);
    },
};
