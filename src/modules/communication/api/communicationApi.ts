// src/modules/communication/api/communicationApi.ts
import { apiClient } from '@/core';
import { leadApi } from '../../leads/api/leadApi';
import { LeadStatus } from '../../leads/types';
import type { Lead, LeadDetail as LeadApiDetail } from '../../leads/types';
import type {
    CreateMailAccountRequest,
    LeadStage,
    Fact,
    LeadCard,
    LeadDetailView,
    LeadThread,
    MailAccount,
    ProviderDetectResult,
    QuoteItem,
    ReviewDecision,
    ReviewItem,
    TimelineItem,
} from '../types';

/** Skrzynka ma własny prefiks; leady obsługuje istniejący leadApi (/v1/leads). */
const MAILBOX_PATH = '/v1/mailbox';

/** Encja leada → karta na tablicy. */
export const toLeadCard = (lead: Lead): LeadCard => ({
    id: lead.id,
    stage: lead.status,
    vehicleBrand: lead.vehicleBrand ?? null,
    vehicleModel: lead.vehicleModel ?? null,
    services: lead.serviceTags?.map((tag) => tag.serviceName) ?? [],
    customerName: lead.customerName ?? null,
    contactIdentifier: lead.contactIdentifier,
    estimatedValue: lead.estimatedValue ?? 0,
    lastActivityAt: lead.newActivityAt ?? lead.updatedAt ?? lead.createdAt,
    hasNewActivity: Boolean(lead.newActivityAt),
    requiresVerification: lead.requiresVerification,
    createdAt: lead.createdAt,
});

/**
 * Chipy faktów. Backend nie ma osobnego pojęcia „zweryfikowanego faktu" — jedyną
 * realną flagą o tej semantyce jest requiresVerification na leadzie, więc tylko ona
 * decyduje o przerywanej ramce.
 */
const toFacts = (lead: LeadApiDetail): Fact[] => {
    const verified = !lead.requiresVerification;
    const facts: Fact[] = [];

    const vehicle = [lead.vehicleBrand, lead.vehicleModel].filter(Boolean).join(' ');
    if (vehicle) facts.push({ id: 'vehicle', key: 'VEHICLE', value: vehicle, verified });

    const services = lead.estimation?.matchedItems?.map((item) => item.serviceName)
        ?? lead.serviceTags?.map((tag) => tag.serviceName)
        ?? [];
    services.forEach((name, index) => {
        facts.push({ id: `service-${index}`, key: 'SERVICE', value: name, verified });
    });

    if (lead.contactIdentifier) {
        facts.push({ id: 'contact', key: 'CONTACT', value: lead.contactIdentifier, verified: true });
    }
    return facts;
};

/** Ręczna wycena ma pierwszeństwo nad wyliczoną — tak samo jak przy generowaniu oferty. */
const toQuoteItems = (lead: LeadApiDetail): QuoteItem[] => {
    const source = lead.userQuote?.items?.length ? lead.userQuote.items : lead.estimation?.matchedItems;
    return (source ?? []).map((item) => ({ name: item.serviceName, price: item.priceGross }));
};

export const communicationApi = {
    // ── Leady (istniejące API) ───────────────────────────────────────────
    async getLeads(status?: LeadStage): Promise<LeadCard[]> {
        const response = await leadApi.getLeads({
            status: status ? [status as LeadStatus] : undefined,
            page: 1,
            limit: 200,
        });
        return response.leads.map(toLeadCard);
    },

    /**
     * Szczegóły leada łączą trzy odczyty: sam lead z wyceną, jego wątek e-mail
     * i komentarze — oś czasu ma pokazywać jedną historię, nie trzy zakładki.
     */
    async getLeadDetail(id: string): Promise<LeadDetailView> {
        const [lead, thread, comments] = await Promise.all([
            leadApi.getLead(id),
            this.getLeadThread(id),
            leadApi.getComments(id).catch(() => []),
        ]);

        const timeline: TimelineItem[] = [
            ...thread.messages.map((message) => ({
                type: 'MESSAGE' as const,
                id: message.id,
                direction: message.direction,
                sentAt: message.sentAt,
                fromName: message.fromName,
                bodyText: message.bodyText,
                sendStatus: message.sendStatus,
            })),
            ...comments.map((comment) => ({
                type: 'NOTE' as const,
                id: comment.id,
                text: comment.content,
                createdAt: comment.createdAt,
                author: comment.createdByName,
            })),
        ];

        const quoteItems = toQuoteItems(lead);
        if (quoteItems.length && lead.userQuote) {
            timeline.push({
                type: 'QUOTE',
                id: lead.userQuote.id,
                items: quoteItems,
                total: quoteItems.reduce((sum, item) => sum + item.price, 0),
                sentAt: lead.userQuote.updatedAt,
            });
        }

        timeline.sort((a, b) => {
            const at = a.type === 'MESSAGE' ? a.sentAt : a.type === 'NOTE' ? a.createdAt : a.sentAt;
            const bt = b.type === 'MESSAGE' ? b.sentAt : b.type === 'NOTE' ? b.createdAt : b.sentAt;
            return new Date(at).getTime() - new Date(bt).getTime();
        });

        return {
            ...toLeadCard(lead),
            facts: toFacts(lead),
            timeline,
            threadId: thread.threadId,
            canReplyFromCrm: thread.canReplyFromCrm,
            quoteItems,
        };
    },

    async changeStage(id: string, stage: LeadStage, reason?: string): Promise<void> {
        await leadApi.updateLeadStatus(id, stage as LeadStatus);
        if (stage === 'LOST' && reason) {
            await leadApi.setLostReason(id, { lostReason: reason });
        }
    },

    async addNote(id: string, text: string) {
        return leadApi.addComment(id, { content: text });
    },

    /** Zdejmuje znacznik nieodczytanej odpowiedzi klienta. */
    async acknowledge(id: string): Promise<void> {
        await leadApi.acknowledgeLead(id);
    },

    // ── Skrzynka i wątki (/v1/mailbox) ──────────────────────────────────
    async getLeadThread(leadId: string): Promise<LeadThread> {
        const response = await apiClient.get<LeadThread>(`${MAILBOX_PATH}/leads/${leadId}/thread`);
        return response.data;
    },

    async reply(threadId: string, bodyHtml: string): Promise<{ messageId: string; leadId: string | null }> {
        const response = await apiClient.post(`${MAILBOX_PATH}/threads/${threadId}/reply`, { bodyHtml });
        return response.data;
    },

    async getReviewQueue(): Promise<ReviewItem[]> {
        const response = await apiClient.get<ReviewItem[]>(`${MAILBOX_PATH}/review`);
        return response.data;
    },

    async reviewDecision(threadId: string, decision: ReviewDecision): Promise<void> {
        await apiClient.post(`${MAILBOX_PATH}/review/${threadId}/decision`, { decision });
    },

    // ── Konta pocztowe ──────────────────────────────────────────────────
    async getMailAccounts(): Promise<MailAccount[]> {
        const response = await apiClient.get<MailAccount[]>(`${MAILBOX_PATH}/accounts`);
        return response.data;
    },

    async detectProvider(email: string): Promise<ProviderDetectResult> {
        const response = await apiClient.post<ProviderDetectResult>(`${MAILBOX_PATH}/accounts/detect`, { email });
        return response.data;
    },

    async createMailAccount(body: CreateMailAccountRequest): Promise<MailAccount> {
        const response = await apiClient.post<MailAccount>(`${MAILBOX_PATH}/accounts`, body);
        return response.data;
    },

    async deleteMailAccount(id: string): Promise<void> {
        await apiClient.delete(`${MAILBOX_PATH}/accounts/${id}`);
    },

    async syncMailAccount(id: string): Promise<void> {
        await apiClient.post(`${MAILBOX_PATH}/accounts/${id}/sync`);
    },
};
