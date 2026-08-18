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
    CommThreadUpdatedPayload,
    DashboardSocketEvent,
    SendMailRequest,
    ThreadListFilters,
} from '../types';

export const COMMS_KEY = ['comms'];
export const COMMS_THREADS_KEY = [...COMMS_KEY, 'threads'];
export const COMMS_ACCOUNTS_KEY = [...COMMS_KEY, 'accounts'];
export const COMMS_LABELS_KEY = [...COMMS_KEY, 'labels'];
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

export const useThread = (threadId: string | null) =>
    useQuery({
        queryKey: [...COMMS_THREADS_KEY, 'detail', threadId],
        queryFn: () => commsApi.getThread(threadId!),
        enabled: threadId !== null,
    });

export const useLabels = () =>
    useQuery({ queryKey: COMMS_LABELS_KEY, queryFn: commsApi.getLabels });

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
        // Optymistycznie: wątek od razu przestaje być nieprzeczytany.
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
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [...COMMS_THREADS_KEY, 'list'] });
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

export const useSetThreadLabel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ threadId, labelId }: { threadId: string; labelId: string | null }) =>
            commsApi.setThreadLabel(threadId, labelId),
        onSettled: () => queryClient.invalidateQueries({ queryKey: COMMS_THREADS_KEY }),
    });
};

export const useCreateLabel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ name, color }: { name: string; color?: string }) =>
            commsApi.createLabel(name, color),
        onSettled: () => queryClient.invalidateQueries({ queryKey: COMMS_LABELS_KEY }),
    });
};

export const useDeleteLabel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (labelId: string) => commsApi.deleteLabel(labelId),
        onSettled: () => queryClient.invalidateQueries({ queryKey: COMMS_KEY }),
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
