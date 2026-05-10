// src/modules/voice-commands/api/voiceCommandsApi.ts

import { apiClient } from '@/core';
import type {
    VoiceContext,
    CreateLeadRequest,
    CreateNoteRequest,
    CreateVoiceItemResponse,
} from '../types';

const BASE = '/mobile/voice';

// Ustaw true żeby pominąć backend podczas lokalnego developmentu
const USE_MOCKS = false;

const mockContext: VoiceContext = {
    firstName: 'Maciej',
    studioName: 'Auto Detailing Pro',
};

export const voiceCommandsApi = {
    getContext: async (token: string): Promise<VoiceContext> => {
        if (USE_MOCKS) {
            await new Promise(r => setTimeout(r, 600));
            if (!token) throw new Error('no token');
            return mockContext;
        }
        const response = await apiClient.get(`${BASE}/context`, {
            params: { token },
        });
        return response.data;
    },

    createLead: async (payload: CreateLeadRequest): Promise<CreateVoiceItemResponse> => {
        if (USE_MOCKS) {
            await new Promise(r => setTimeout(r, 800));
            console.log('[mock] createLead', payload);
            return { id: `lead_${Date.now()}`, message: 'Lead utworzony' };
        }
        const response = await apiClient.post(`${BASE}/lead`, payload);
        return response.data;
    },

    createNote: async (payload: CreateNoteRequest): Promise<CreateVoiceItemResponse> => {
        if (USE_MOCKS) {
            await new Promise(r => setTimeout(r, 800));
            console.log('[mock] createNote', payload);
            return { id: `note_${Date.now()}`, message: 'Notatka zapisana' };
        }
        const response = await apiClient.post(`${BASE}/note`, payload);
        return response.data;
    },
};
