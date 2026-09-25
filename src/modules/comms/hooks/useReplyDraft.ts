// src/modules/comms/hooks/useReplyDraft.ts
// Szkic odpowiedzi na maila - generowany na kliknięcie, nigdy w tle.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commsApi } from '../api/commsApi';
import type { DraftReplyPayload, ReplyDraftPreferences } from '../types';
import { COMMS_KEY } from './useComms';

export const REPLY_DRAFT_PREFERENCES_KEY = [...COMMS_KEY, 'reply-draft', 'preferences'];

export const useReplyDraftPreferences = () =>
    useQuery({
        queryKey: REPLY_DRAFT_PREFERENCES_KEY,
        queryFn: commsApi.getReplyDraftPreferences,
        staleTime: 5 * 60 * 1000,
    });

export const useSaveReplyDraftPreferences = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (useSentStyle: boolean) => commsApi.saveReplyDraftPreferences(useSentStyle),
        onSuccess: (preferences) =>
            queryClient.setQueryData<ReplyDraftPreferences>(REPLY_DRAFT_PREFERENCES_KEY, preferences),
    });
};

/** Nowy szkic albo poprawka istniejącego - ten sam adres, patrz `DraftReplyPayload`. */
export const useDraftReply = () =>
    useMutation({
        mutationFn: ({ threadId, ...payload }: DraftReplyPayload & { threadId: string }) =>
            commsApi.draftReply(threadId, payload),
    });
