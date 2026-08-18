// src/modules/communication/hooks/useCommunication.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { communicationApi } from '../api/communicationApi';
import type { CreateMailAccountRequest, LeadStage, ReviewDecision } from '../types';

export const COMM_LEADS_KEY = ['communication', 'leads'];
export const commLeadListKey = (stage?: LeadStage) => [...COMM_LEADS_KEY, 'list', stage ?? 'all'];
export const commLeadDetailKey = (id: string) => [...COMM_LEADS_KEY, 'detail', id];
export const COMM_REVIEW_KEY = ['communication', 'review'];
export const COMM_MAIL_ACCOUNTS_KEY = ['communication', 'mail-accounts'];

// ─── Leady ──────────────────────────────────────────────────────────────

export const useLeadCards = (stage?: LeadStage) =>
    useQuery({
        queryKey: commLeadListKey(stage),
        queryFn: () => communicationApi.getLeads(stage),
        staleTime: 30_000,
    });

export const useLeadDetail = (id: string | null) =>
    useQuery({
        queryKey: commLeadDetailKey(id ?? ''),
        queryFn: () => communicationApi.getLeadDetail(id as string),
        enabled: Boolean(id),
        staleTime: 15_000,
    });

/**
 * Przeciągnięcie karty przestawia status od razu w cache, żeby tablica nie „skakała"
 * pod kursorem; przy błędzie wracamy do poprzedniego stanu.
 */
export const useStageChange = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, stage, reason }: { id: string; stage: LeadStage; reason?: string }) =>
            communicationApi.changeStage(id, stage, reason),
        onMutate: async ({ id, stage }) => {
            await queryClient.cancelQueries({ queryKey: COMM_LEADS_KEY });
            const snapshot = queryClient.getQueriesData({ queryKey: COMM_LEADS_KEY });
            queryClient.setQueriesData({ queryKey: commLeadListKey() }, (old: unknown) => {
                if (!Array.isArray(old)) return old;
                return old.map((card) => (card.id === id ? { ...card, stage } : card));
            });
            return { snapshot };
        },
        onError: (_error, _variables, context) => {
            context?.snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: COMM_LEADS_KEY });
        },
    });
};

export const useSendReply = (leadId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ threadId, bodyHtml }: { threadId: string; bodyHtml: string }) =>
            communicationApi.reply(threadId, bodyHtml),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: commLeadDetailKey(leadId) });
            void queryClient.invalidateQueries({ queryKey: COMM_LEADS_KEY });
        },
    });
};

export const useAddNote = (leadId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (text: string) => communicationApi.addNote(leadId, text),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: commLeadDetailKey(leadId) });
        },
    });
};

/** Otwarcie leada z nową odpowiedzią klienta zdejmuje znacznik aktywności. */
export const useAcknowledgeLead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (leadId: string) => communicationApi.acknowledge(leadId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: COMM_LEADS_KEY });
        },
    });
};

// ─── Kolejka „Do przejrzenia" ───────────────────────────────────────────

export const useReviewQueue = () =>
    useQuery({
        queryKey: COMM_REVIEW_KEY,
        queryFn: () => communicationApi.getReviewQueue(),
        staleTime: 60_000,
    });

export const useReviewDecision = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ threadId, decision }: { threadId: string; decision: ReviewDecision }) =>
            communicationApi.reviewDecision(threadId, decision),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: COMM_REVIEW_KEY });
            void queryClient.invalidateQueries({ queryKey: COMM_LEADS_KEY });
        },
    });
};

// ─── Skrzynki ───────────────────────────────────────────────────────────

export const useMailAccounts = () =>
    useQuery({
        queryKey: COMM_MAIL_ACCOUNTS_KEY,
        queryFn: () => communicationApi.getMailAccounts(),
        staleTime: 60_000,
    });

export const useDetectProvider = () =>
    useMutation({ mutationFn: (email: string) => communicationApi.detectProvider(email) });

export const useCreateMailAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateMailAccountRequest) => communicationApi.createMailAccount(body),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: COMM_MAIL_ACCOUNTS_KEY });
        },
    });
};

export const useDeleteMailAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => communicationApi.deleteMailAccount(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: COMM_MAIL_ACCOUNTS_KEY });
        },
    });
};

export const useSyncMailAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => communicationApi.syncMailAccount(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: COMM_MAIL_ACCOUNTS_KEY });
        },
    });
};
