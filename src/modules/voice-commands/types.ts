// src/modules/voice-commands/types.ts

// ─── API contracts ────────────────────────────────────────────────────────────

export interface VoiceContext {
    firstName: string;
    studioName: string;
}

export interface CreateLeadRequest {
    token: string;
    phoneNumber: string | null;
    text: string;
}

export interface CreateNoteRequest {
    token: string;
    text: string;
}

export interface CreateVoiceItemResponse {
    id: string;
    message: string;
}

// ─── UI state ─────────────────────────────────────────────────────────────────

export type VoiceMode = 'lead' | 'note';

export type SessionState = 'loading' | 'error' | 'active';

export type VoiceScreen = 'home' | 'phone' | 'dictate' | 'send';

export type DictateState = 'recording' | 'editing';

export type SendStatus = 'sending' | 'success' | 'error';
