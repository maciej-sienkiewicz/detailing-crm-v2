// src/modules/comms/hooks/useComms.ts
import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IMessage } from '@stomp/stompjs';
import { onSocketConnect, subscribeToTopic } from '@/core/socketClient';
import { useAuth } from '@/core';
import { useToast } from '@/common/components/Toast';
import { commsApi } from '../api/commsApi';
import type {
    CommMessageReadPayload,
    CommThreadDetail,
    CommThreadPage,
    CommThreadUpdatedPayload,
    DashboardSocketEvent,
    SendMailRequest,
    ThreadListFilters,
} from '../types';

export const COMMS_KEY = ['comms'];
export const COMMS_THREADS_KEY = [...COMMS_KEY, 'threads'];
export const COMMS_ACCOUNTS_KEY = [...COMMS_KEY, 'accounts'];
export const COMMS_INSIGHTS_KEY = [...COMMS_KEY, 'insights'];

export const useMailAccounts = (options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: COMMS_ACCOUNTS_KEY,
        queryFn: commsApi.getAccounts,
        enabled: options?.enabled ?? true,
    });

export const useThreads = (filters: ThreadListFilters) =>
    useQuery({
        queryKey: [...COMMS_THREADS_KEY, 'list', filters],
        queryFn: () => commsApi.getThreads(filters),
        placeholderData: (previous) => previous,
    });

const threadDetailQuery = (threadId: string) => ({
    queryKey: [...COMMS_THREADS_KEY, 'detail', threadId],
    queryFn: () => commsApi.getThread(threadId),
    // Wątek otwarty przed chwilą wraca z cache bez requestu — przełączanie tam
    // i z powrotem nie miga wtedy w ogóle. Świeżość pilnuje WebSocket, który
    // unieważnia konkretny wątek, gdy coś się w nim zmieni.
    staleTime: 5 * 60_000,
});

export const useThread = (threadId: string | null) =>
    useQuery({
        ...threadDetailQuery(threadId ?? ''),
        enabled: threadId !== null,
    });

/**
 * Wciąga wątek do cache, zanim użytkownik go kliknie (najechanie myszą, dotknięcie).
 * Kliknięcie zastaje wtedy gotowe dane i treść podmienia się bez etapu ładowania.
 */
export const usePrefetchThread = () => {
    const queryClient = useQueryClient();
    return useCallback(
        (threadId: string, participantEmail?: string) => {
            queryClient.prefetchQuery(threadDetailQuery(threadId));
            // Pasek klienta korzysta z tego samego cache — pobrany razem z wątkiem
            // nie dosuwa treści w dół chwilę po jej pokazaniu.
            if (participantEmail) {
                queryClient.prefetchQuery({
                    queryKey: [...COMMS_INSIGHTS_KEY, participantEmail, threadId],
                    queryFn: () => commsApi.getInsights(participantEmail, threadId),
                    staleTime: 30_000,
                });
            }
        },
        [queryClient]
    );
};

export const useContactInsights = (email: string | null, threadId?: string) =>
    useQuery({
        queryKey: [...COMMS_INSIGHTS_KEY, email, threadId],
        queryFn: () => commsApi.getInsights(email!, threadId),
        enabled: email !== null,
        staleTime: 30_000,
    });

/** Liczba nieprzeczytanych — do plakietki w menu bocznym. */
export const useUnreadMailCount = (options?: { enabled?: boolean }): number => {
    const { data } = useQuery({
        queryKey: [...COMMS_THREADS_KEY, 'list', { page: 0, pageSize: 1, archived: false }],
        queryFn: () => commsApi.getThreads({ page: 0, pageSize: 1, archived: false }),
        select: (page) => page.totalUnread,
        enabled: options?.enabled ?? true,
    });
    return Number(data ?? 0);
};

export const useMarkThreadRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (threadId: string) => commsApi.markThreadRead(threadId),
        // Optymistycznie: wątek od razu przestaje być nieprzeczytany — i na tym
        // koniec. Wcześniejsze unieważnienie listy powodowało jej refetch przy
        // KAŻDYM otwarciu wiadomości, a więc przerysowanie całej lewej kolumny —
        // to był główny „mrugający" element widoku. Licznik korygujemy lokalnie,
        // bo dokładnie wiemy, o ile spadł.
        onMutate: async (threadId) => {
            queryClient.setQueryData<CommThreadDetail>(
                [...COMMS_THREADS_KEY, 'detail', threadId],
                (old) =>
                    old && {
                        ...old,
                        thread: { ...old.thread, unreadCount: 0 },
                        messages: old.messages.map((m) => ({ ...m, isRead: true })),
                    }
            );
            queryClient.setQueriesData<CommThreadPage>(
                { queryKey: [...COMMS_THREADS_KEY, 'list'] },
                (page) => {
                    if (!page) return page;
                    const target = page.items.find((item) => item.id === threadId);
                    if (!target || target.unreadCount === 0) return page;
                    return {
                        ...page,
                        totalUnread: Math.max(0, page.totalUnread - target.unreadCount),
                        items: page.items.map((item) =>
                            item.id === threadId ? { ...item, unreadCount: 0 } : item
                        ),
                    };
                }
            );
        },
    });
};

export const useSetThreadArchived = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ threadId, archived }: { threadId: string; archived: boolean }) =>
            commsApi.setThreadArchived(threadId, archived),
        onSettled: () => queryClient.invalidateQueries({ queryKey: COMMS_THREADS_KEY }),
    });
};

export const useSendMail = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: SendMailRequest) => commsApi.send(request),
        onSuccess: (result) => {
            queryClient.invalidateQueries({
                queryKey: [...COMMS_THREADS_KEY, 'detail', result.threadId],
            });
            queryClient.invalidateQueries({ queryKey: [...COMMS_THREADS_KEY, 'list'] });
        },
    });
};

export const useSyncAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (accountId: string) => commsApi.syncAccount(accountId),
        onSettled: () => {
            // Sync działa w tle; efekty przyjdą WebSocketem, tu tylko odświeżamy stan konta.
            setTimeout(
                () => queryClient.invalidateQueries({ queryKey: COMMS_ACCOUNTS_KEY }),
                3000
            );
        },
    });
};

// ── Onboarding skrzynki ──────────────────────────────────────────────────────

export const useDetectProvider = () =>
    useMutation({ mutationFn: (email: string) => commsApi.detectProvider(email) });

export const useConnectAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: commsApi.connectAccount,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: COMMS_ACCOUNTS_KEY }),
    });
};

export const useDisconnectAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (accountId: string) => commsApi.disconnectAccount(accountId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: COMMS_ACCOUNTS_KEY }),
    });
};

// ── WebSocket: żywa skrzynka ─────────────────────────────────────────────────

/**
 * Subskrypcja zdarzeń komunikacji na topicu dashboardu. Payloady niosą tylko id —
 * po zdarzeniu odświeżamy dane przez REST, więc cache nigdy nie rozjeżdża się
 * z serwerem, a utracone podczas rozłączenia zdarzenia nadrabia refetch po reconnable.
 */
export function useCommsSocket(): void {
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();
    const { showInfo } = useToast();

    const handleMessage = useCallback(
        (message: IMessage) => {
            let event: DashboardSocketEvent;
            try {
                event = JSON.parse(message.body);
            } catch {
                return;
            }

            switch (event.type) {
                case 'COMM_THREAD_UPDATED': {
                    const payload = event.payload as CommThreadUpdatedPayload;
                    queryClient.invalidateQueries({ queryKey: [...COMMS_THREADS_KEY, 'list'] });
                    queryClient.invalidateQueries({
                        queryKey: [...COMMS_THREADS_KEY, 'detail', payload.threadId],
                    });
                    if (payload.newMessage) {
                        showInfo('Nowa wiadomość', 'Masz nową wiadomość w skrzynce');
                    }
                    break;
                }
                case 'COMM_MESSAGE_READ': {
                    const payload = event.payload as CommMessageReadPayload;
                    queryClient.invalidateQueries({ queryKey: [...COMMS_THREADS_KEY, 'list'] });
                    queryClient.invalidateQueries({
                        queryKey: [...COMMS_THREADS_KEY, 'detail', payload.threadId],
                    });
                    break;
                }
                default:
                    break;
            }
        },
        [queryClient, showInfo]
    );

    const handleMessageRef = useRef(handleMessage);
    useEffect(() => {
        handleMessageRef.current = handleMessage;
    }, [handleMessage]);

    useEffect(() => {
        if (!isAuthenticated || !user?.studioId) return;

        const topic = `/topic/studio.${user.studioId}.dashboard`;
        const unsubscribe = subscribeToTopic(topic, (message) =>
            handleMessageRef.current(message)
        );
        const removeConnectListener = onSocketConnect(({ isReconnect }) => {
            if (!isReconnect) return;
            queryClient.invalidateQueries({ queryKey: COMMS_KEY });
        });

        return () => {
            unsubscribe();
            removeConnectListener();
        };
    }, [isAuthenticated, user?.studioId, queryClient]);
}

// ── Stopka nadawcy ───────────────────────────────────────────────────────────

export const COMMS_SIGNATURE_KEY = [...COMMS_KEY, 'signature'];

export const useMailSignature = () =>
    useQuery({
        queryKey: COMMS_SIGNATURE_KEY,
        queryFn: commsApi.getSignature,
        staleTime: 5 * 60_000,
    });

export const useSaveMailSignature = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ bodyHtml, enabledByDefault }: { bodyHtml: string; enabledByDefault: boolean }) =>
            commsApi.saveSignature(bodyHtml, enabledByDefault),
        onSuccess: (signature) => queryClient.setQueryData(COMMS_SIGNATURE_KEY, signature),
    });
};

export const useDeleteMailSignature = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: commsApi.deleteSignature,
        onSuccess: () =>
            queryClient.setQueryData(COMMS_SIGNATURE_KEY, { bodyHtml: null, enabledByDefault: false }),
    });
};
