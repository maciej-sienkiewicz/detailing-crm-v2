// src/modules/voice-commands/api/mobileShortcutTokenApi.ts

import { apiClient } from '@/core';

const PATH = '/v1/me/mobile-token';

interface MobileShortcutTokenResponse {
    /** null = to konto nie dostaje skrótów mobilnych (np. piaskownica podglądu roli). */
    token: string | null;
}

/**
 * Token skrótów mobilnych - pobierany na żądanie, tylko na stronie „Skróty mobilne".
 * Dawniej przychodził w każdej odpowiedzi /auth/me, choć działa bez sesji.
 */
export const mobileShortcutTokenApi = {
    get: async (): Promise<string | null> =>
        (await apiClient.get<MobileShortcutTokenResponse>(PATH)).data.token,

    /** Nowy token; linki zapisane na telefonach z poprzednim przestają działać. */
    rotate: async (): Promise<string | null> =>
        (await apiClient.post<MobileShortcutTokenResponse>(`${PATH}/rotate`)).data.token,
};
