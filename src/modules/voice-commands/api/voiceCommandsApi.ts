// src/modules/voice-commands/api/voiceCommandsApi.ts

import { apiClient } from '@/core';
import type {
    VoiceContext,
    CreateLeadRequest,
    CreateNoteRequest,
    CreateVoiceItemResponse,
} from '../types';

const BASE = '/mobile/voice';

export const voiceCommandsApi = {
    getContext: async (token: string): Promise<VoiceContext> => {
        const response = await apiClient.get(`${BASE}/context`, {
            params: { token },
        });
        return response.data;
    },

    createLead: async (payload: CreateLeadRequest): Promise<CreateVoiceItemResponse> => {
        const response = await apiClient.post(`${BASE}/lead`, payload);
        return response.data;
    },

    createNote: async (payload: CreateNoteRequest): Promise<CreateVoiceItemResponse> => {
        const response = await apiClient.post(`${BASE}/note`, payload);
        return response.data;
    },
};
