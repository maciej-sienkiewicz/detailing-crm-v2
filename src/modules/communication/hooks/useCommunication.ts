// src/modules/communication/hooks/useCommunication.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { communicationApi } from '../api/communicationApi';
import type {
    CreateMailAccountRequest,
    LeadCard,
    LeadDetail,
    LeadListResponse,
    LeadStage,
    MailAccount,
    ProviderDetectResult,
    ReplyRequest,
    ReviewDecision,
    ReviewQueueResponse,
} from '../types';

// ── Klucze cache ─────────────────────────────────────────────────────────
export const COMM_LEADS_KEY = ['communication', 'leads'];
export const commLeadListKey = (stage?: LeadStage) => [...COMM_LEADS_KEY, 'list', stage ?? 'all'];
export const commLeadDetailKey = (id: number) => [...COMM_LEADS_KEY, 'detail', id];
export const COMM_REVIEW_KEY = ['communication', 'review'];
export const COMM_MAIL_ACCOUNTS_KEY = ['communication', 'mail-accounts'];

/** Lista kart leadów (opcjonalnie filtrowana etapem). */
export const useLeadCards = (stage?: LeadStage) =>
    useQuery<LeadListResponse>({
        queryKey: commLeadListKey(stage),
        queryFn: () => communicationApi.getLeads(stage),
        staleTime: 15_000,
    });

/** Szczegóły leada (fakty + wątek). */
export const useLeadDetail = (id: number | null) =>
    useQuery<LeadDetail>({
        queryKey: commLeadDetailKey(id ?? -1),
        queryFn: () => communicationApi.getLead(id as number),
        enabled: id !== null,
    });

/** Wysyłka odpowiedzi (opcjonalnie z wyceną i zmianą etapu). Optimistic bubble w wątku. */
export const useReply = (leadId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: ReplyRequest) => communicationApi.reply(leadId, body),
        onMutate: async (body) => {
            await queryClient.cancelQueries({ queryKey: commLeadDetailKey(leadId) });
            const previous = queryClient.getQueryData<LeadDetail>(commLeadDetailKey(leadId));
            if (previous) {
                const now = new Date().toISOString();
                const optimistic: LeadDetail = {
                    ...previous,
                    lastDirection: 'OUTBOUND',
                    lastMessageAt: now,
                    timeline: [
                        ...previous.timeline,
                        {
                            type: 'MESSAGE',
                            id: -Date.now(),
                            direction: 'OUTBOUND',
                            sentAt: now,
                            fromName: null,
                            bodyText: body.bodyText,
                        },
                        ...(body.quote
                            ? [{
                                type: 'QUOTE' as const,
                                id: -Date.now() - 1,
                                items: body.quote.items,
                                total: body.quote.items.reduce((sum, item) => sum + item.price, 0),
                                sentAt: now,
                            }]
                            : []),
                    ],
                };
                queryClient.setQueryData(commLeadDetailKey(leadId), optimistic);
            }
            return { previous };
        },
        onError: (_error, _body, context) => {
            if (context?.previous) {
                queryClient.setQueryData(commLeadDetailKey(leadId), context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: commLeadDetailKey(leadId) });
            queryClient.invalidateQueries({ queryKey: COMM_LEADS_KEY, exact: false });
        },
    });
};

/** Zmiana etapu leada — optymistycznie przestawia kartę na tablicy. */
export const useStageChange = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ leadId, stage, reason }: { leadId: number; stage: LeadStage; reason?: string }) =>
            communicationApi.changeStage(leadId, { stage, reason }),
        onMutate: async ({ leadId, stage }) => {
            await queryClient.cancelQueries({ queryKey: COMM_LEADS_KEY });
            const previousLists = queryClient.getQueriesData<LeadListResponse>({ queryKey: COMM_LEADS_KEY });
            queryClient.setQueriesData<LeadListResponse>(
                { queryKey: [...COMM_LEADS_KEY, 'list'] },
                (old) => old && {
                    leads: old.leads.map((lead: LeadCard) =>
                        lead.id === leadId ? { ...lead, stage } : lead),
                },
            );
            const detail = queryClient.getQueryData<LeadDetail>(commLeadDetailKey(leadId));
            if (detail) {
                queryClient.setQueryData(commLeadDetailKey(leadId), { ...detail, stage });
            }
            return { previousLists };
        },
        onError: (_error, _vars, context) => {
            context?.previousLists?.forEach(([key, data]) => queryClient.setQueryData(key, data));
        },
        onSettled: (_data, _error, { leadId }) => {
            queryClient.invalidateQueries({ queryKey: COMM_LEADS_KEY, exact: false });
            queryClient.invalidateQueries({ queryKey: commLeadDetailKey(leadId) });
        },
    });
};

/** Dodanie notatki do wątku. */
export const useAddNote = (leadId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (text: string) => communicationApi.addNote(leadId, text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: commLeadDetailKey(leadId) });
        },
    });
};

/** Edycja / zatwierdzenie pojedynczego faktu-chipa. */
export const useUpdateFact = (leadId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ factId, value }: { factId: number; value: string }) =>
            communicationApi.updateFact(leadId, { factId, value }),
        onSuccess: (fact) => {
            const detail = queryClient.getQueryData<LeadDetail>(commLeadDetailKey(leadId));
            if (detail) {
                queryClient.setQueryData(commLeadDetailKey(leadId), {
                    ...detail,
                    facts: detail.facts.map((f) => (f.id === fact.id ? fact : f)),
                });
            }
            queryClient.invalidateQueries({ queryKey: commLeadDetailKey(leadId) });
        },
    });
};

/** Zatwierdzenie wszystkich faktów (weryfikacja domniemana). */
export const useVerifyFacts = (leadId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => communicationApi.verifyAllFacts(leadId),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: commLeadDetailKey(leadId) });
            const previous = queryClient.getQueryData<LeadDetail>(commLeadDetailKey(leadId));
            if (previous) {
                queryClient.setQueryData(commLeadDetailKey(leadId), {
                    ...previous,
                    facts: previous.facts.map((f) => ({ ...f, verified: true })),
                });
            }
            return { previous };
        },
        onError: (_error, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(commLeadDetailKey(leadId), context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: commLeadDetailKey(leadId) });
        },
    });
};

/** Kolejka "Do przejrzenia" (wątki UNSURE). */
export const useReviewQueue = () =>
    useQuery<ReviewQueueResponse>({
        queryKey: COMM_REVIEW_KEY,
        queryFn: () => communicationApi.getReviewQueue(),
        staleTime: 30_000,
    });

/** Decyzja dla wątku z kolejki przeglądu. */
export const useReviewDecision = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ threadId, decision }: { threadId: number; decision: ReviewDecision }) =>
            communicationApi.decideReview(threadId, decision),
        onSuccess: (_data, { threadId }) => {
            const queue = queryClient.getQueryData<ReviewQueueResponse>(COMM_REVIEW_KEY);
            if (queue) {
                queryClient.setQueryData(COMM_REVIEW_KEY, {
                    items: queue.items.filter((item) => item.threadId !== threadId),
                });
            }
            queryClient.invalidateQueries({ queryKey: COMM_REVIEW_KEY });
            queryClient.invalidateQueries({ queryKey: COMM_LEADS_KEY, exact: false });
        },
    });
};

// ── Skrzynki pocztowe ────────────────────────────────────────────────────

export const useMailAccounts = () =>
    useQuery<MailAccount[]>({
        queryKey: COMM_MAIL_ACCOUNTS_KEY,
        queryFn: () => communicationApi.getMailAccounts(),
    });

export const useDetectProvider = () =>
    useMutation<ProviderDetectResult, Error, string>({
        mutationFn: (email: string) => communicationApi.detectProvider(email),
    });

export const useCreateMailAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateMailAccountRequest) => communicationApi.createMailAccount(body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COMM_MAIL_ACCOUNTS_KEY });
        },
    });
};

export const useDeleteMailAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => communicationApi.deleteMailAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COMM_MAIL_ACCOUNTS_KEY });
        },
    });
};

export const useSyncMailAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => communicationApi.syncMailAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COMM_MAIL_ACCOUNTS_KEY });
        },
    });
};
