// src/modules/communication/api/communicationApi.ts
import { apiClient } from '@/core';
import type {
    CreateMailAccountRequest,
    Fact,
    LeadDetail,
    LeadListResponse,
    LeadStage,
    MailAccount,
    NoteTimelineItem,
    ProviderDetectResult,
    ReplyRequest,
    ReplyResponse,
    ReviewDecision,
    ReviewQueueResponse,
    StageChangeRequest,
    UpdateFactRequest,
} from '../types';

const BASE_PATH = '/communication';

export const communicationApi = {
    // ── Leady ────────────────────────────────────────────────────────────
    async getLeads(stage?: LeadStage): Promise<LeadListResponse> {
        const response = await apiClient.get<LeadListResponse>(`${BASE_PATH}/leads`, {
            params: stage ? { stage } : undefined,
        });
        return response.data;
    },

    async getLead(id: number): Promise<LeadDetail> {
        const response = await apiClient.get<LeadDetail>(`${BASE_PATH}/leads/${id}`);
        return response.data;
    },

    async reply(id: number, body: ReplyRequest): Promise<ReplyResponse> {
        const response = await apiClient.post<ReplyResponse>(`${BASE_PATH}/leads/${id}/reply`, body);
        return response.data;
    },

    async changeStage(id: number, body: StageChangeRequest): Promise<void> {
        await apiClient.patch(`${BASE_PATH}/leads/${id}/stage`, body);
    },

    async addNote(id: number, text: string): Promise<NoteTimelineItem> {
        const response = await apiClient.post<NoteTimelineItem>(`${BASE_PATH}/leads/${id}/notes`, { text });
        return response.data;
    },

    async updateFact(id: number, body: UpdateFactRequest): Promise<Fact> {
        const response = await apiClient.put<Fact>(`${BASE_PATH}/leads/${id}/facts`, body);
        return response.data;
    },

    async verifyAllFacts(id: number): Promise<void> {
        await apiClient.post(`${BASE_PATH}/leads/${id}/facts/verify`);
    },

    // ── Do przejrzenia (UNSURE) ──────────────────────────────────────────
    async getReviewQueue(): Promise<ReviewQueueResponse> {
        const response = await apiClient.get<ReviewQueueResponse>(`${BASE_PATH}/review`);
        return response.data;
    },

    async decideReview(threadId: number, decision: ReviewDecision): Promise<void> {
        await apiClient.post(`${BASE_PATH}/review/${threadId}/decision`, { decision });
    },

    // ── Skrzynki pocztowe ────────────────────────────────────────────────
    async detectProvider(email: string): Promise<ProviderDetectResult> {
        const response = await apiClient.post<ProviderDetectResult>(
            `${BASE_PATH}/mail-accounts/detect`,
            { email },
            { skipErrorToast: true },
        );
        return response.data;
    },

    async createMailAccount(body: CreateMailAccountRequest): Promise<MailAccount> {
        const response = await apiClient.post<MailAccount>(`${BASE_PATH}/mail-accounts`, body, {
            skipErrorToast: true,
        });
        return response.data;
    },

    async getMailAccounts(): Promise<MailAccount[]> {
        const response = await apiClient.get<MailAccount[]>(`${BASE_PATH}/mail-accounts`);
        return response.data;
    },

    async deleteMailAccount(id: number): Promise<void> {
        await apiClient.delete(`${BASE_PATH}/mail-accounts/${id}`);
    },

    async syncMailAccount(id: number): Promise<void> {
        await apiClient.post(`${BASE_PATH}/mail-accounts/${id}/sync`);
    },
};
