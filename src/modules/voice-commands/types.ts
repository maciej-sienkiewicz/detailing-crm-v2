// src/modules/voice-commands/types.ts

// ─── API contracts ────────────────────────────────────────────────────────────

export interface VoiceContext {
    firstName: string;
    studioName: string;
}

export interface CreateLeadRequest {
    token: string;
    audioBlob: Blob;
    mimeType: string;
    phoneNumber: string | null;
}

export interface CreateNoteRequest {
    token: string;
    audioBlob: Blob;
    mimeType: string;
}

export interface CreateVoiceItemResponse {
    id: string;
    message: string;
}

// ─── UI state ─────────────────────────────────────────────────────────────────

export type VoiceMode = 'lead' | 'note';

export type SessionState = 'loading' | 'error' | 'active';

export type VoiceScreen = 'home' | 'phone' | 'dictate' | 'send';

export type RecordingState = 'requesting' | 'recording' | 'error';

export type SendStatus = 'sending' | 'success' | 'error';
