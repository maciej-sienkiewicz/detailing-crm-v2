// src/modules/voice-commands/api/voiceCommandsApi.ts

import { apiClient } from '@/core';
import type {
    VoiceContext,
    CreateLeadRequest,
    CreateNoteRequest,
    CreateVoiceItemResponse,
} from '../types';

const BASE = '/v1/mobile/voice';

function getFilename(mimeType: string): string {
    if (mimeType.startsWith('audio/mp4')) return 'audio.m4a';
    if (mimeType.startsWith('audio/ogg')) return 'audio.ogg';
    return 'audio.webm';
}

export const voiceCommandsApi = {
    // Token w nagłówku, nie w adresie: adres trafia do logów proxy, a token działa bez sesji.
    getContext: async (token: string): Promise<VoiceContext> => {
        // Ekran „Link nieaktywny" mówi wszystko - bez tostów „nieoczekiwany błąd" pod nim.
        const response = await apiClient.get(`${BASE}/context`, {
            headers: { 'X-Mobile-Token': token },
            skipErrorToast: true,
        });
        return response.data;
    },

    /**
     * Odkłada token w ciasteczku pod adresem manifestu skrótu (useVoiceShortcutManifest).
     * Manifest pobiera sama przeglądarka, bez naszego nagłówka - a w adresie token trafiłby do logów.
     */
    rememberShortcut: async (token: string): Promise<void> => {
        await apiClient.post(`${BASE}/shortcut`, null, {
            headers: { 'X-Mobile-Token': token },
            skipErrorToast: true,
        });
    },

    createLead: async (payload: CreateLeadRequest): Promise<CreateVoiceItemResponse> => {
        const form = new FormData();
        form.append('token', payload.token);
        form.append('audio', new File(
            [payload.audioBlob],
            getFilename(payload.mimeType),
            { type: payload.mimeType },
        ));
        if (payload.phoneNumber) form.append('phoneNumber', payload.phoneNumber);
        const response = await apiClient.post(`${BASE}/lead`, form, { skipErrorToast: true });
        return response.data;
    },

    createNote: async (payload: CreateNoteRequest): Promise<CreateVoiceItemResponse> => {
        const form = new FormData();
        form.append('token', payload.token);
        form.append('audio', new File(
            [payload.audioBlob],
            getFilename(payload.mimeType),
            { type: payload.mimeType },
        ));
        const response = await apiClient.post(`${BASE}/note`, form, { skipErrorToast: true });
        return response.data;
    },
};
