// src/modules/comms/hooks/useInstagramDm.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { instagramDmApi } from '../api/instagramDmApi';
import type { InstagramDmConversation } from '../types';
import { LEADS_KEY } from './useLeads';

/** Pod prefiksem leadów: unieważnienie sprawy (np. z gniazda) odświeża i rozmowę. */
export const instagramDmKey = (leadId: string | null) => [...LEADS_KEY, 'instagram-dm', leadId];

export const useInstagramConversation = (leadId: string | null, enabled: boolean) =>
    useQuery({
        queryKey: instagramDmKey(leadId),
        queryFn: () => instagramDmApi.getByLead(leadId!),
        enabled: enabled && leadId !== null,
        // Okno 24 h zamyka się samo, bez żadnego zdarzenia - odświeżenie co minutę
        // pilnuje, żeby pole odpowiedzi nie obiecywało wysyłki, która już nie wyjdzie.
        refetchInterval: 60_000,
    });

export const useInstagramReply = (leadId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ threadId, text }: { threadId: string; text: string }) => instagramDmApi.reply(threadId, text),
        onSuccess: (conversation: InstagramDmConversation) => {
            queryClient.setQueryData(instagramDmKey(leadId), conversation);
            // Odpowiedź przesuwa sprawę na „W kontakcie" i stempluje pierwszą reakcję -
            // kolejka, plakietka i oś czasu muszą to zobaczyć od razu.
            queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'detail', leadId] });
            queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'history', leadId] });
            queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'list'] });
        },
    });
};

export const useMarkInstagramRead = (leadId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (threadId: string) => instagramDmApi.markRead(threadId),
        onSuccess: () => {
            queryClient.setQueryData<InstagramDmConversation | null>(instagramDmKey(leadId), (cached) =>
                cached ? { ...cached, thread: { ...cached.thread, unreadCount: 0 } } : cached
            );
        },
    });
};
