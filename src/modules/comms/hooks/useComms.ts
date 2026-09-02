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
export const COMMS_BADGES_KEY = [...COMMS_KEY, 'contact-badges'];
export const COMMS_NOTES_KEY = [...COMMS_KEY, 'notes'];
export const COMMS_CONTACT_CARD_KEY = [...COMMS_KEY, 'contact-card'];
export const COMMS_FORM_SOURCES_KEY = [...COMMS_KEY, 'form-sources'];

export const useMailAccounts = (options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: COMMS_ACCOUNTS_KEY,
        queryFn: commsApi.getAccounts,
        enabled: options?.enabled ?? true,
    });

/**
 * Czy trwa pierwsza synchronizacja którejś ze skrzynek — i jak daleko zaszła.
 *
 * Pierwszy import potrafi trwać minuty; przez ten czas widoki poczty i leadów
 * pokazują stan „trwa synchronizacja" zamiast list, które rosną z sekundy na
 * sekundę, i zamiast lawiny powiadomień. Dopóki trwa, konta odpytujemy co parę
 * sekund — pasek postępu bez odświeżania byłby martwy; po zakończeniu odpytywanie
 * gaśnie samo.
 */
export const useMailboxSyncState = () => {
    const { data: accounts } = useQuery({
        queryKey: COMMS_ACCOUNTS_KEY,
        queryFn: commsApi.getAccounts,
        refetchInterval: (query) =>
            query.state.data?.some(
                (account) => account.initialSyncInProgress && account.status === 'ACTIVE'
            )
                ? 4_000
                : false,
    });

    // Tylko konta ACTIVE: skrzynka z odrzuconym hasłem nigdy się nie zsynchronizuje
    // i ma pokazywać swój błąd, a nie wieczny ekran „trwa synchronizacja".
    const syncingAccounts = (accounts ?? []).filter(
        (account) => account.initialSyncInProgress && account.status === 'ACTIVE'
    );
    const total = syncingAccounts.reduce((sum, account) => sum + (account.syncTotal ?? 0), 0);
    const processed = syncingAccounts.reduce((sum, account) => sum + (account.syncProcessed ?? 0), 0);

    return {
        /** false także wtedy, gdy konta jeszcze się nie wczytały — widok nie ma migać. */
        syncing: syncingAccounts.length > 0,
        /** Ułamek 0–1 albo null, gdy przebieg jeszcze nie zgłosił liczby wiadomości. */
        progress: total > 0 ? Math.min(1, processed / total) : null,
        processed,
        total,
    };
};

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

/**
 * Plakietki nagłówka rozmowy: ile innych wątków z tym adresem i ile notatek.
 * Osobne zapytanie od insights, bo nagłówek musi być gotowy zaraz po kliknięciu,
 * a insights ciągnie wizyty, rezerwacje i leady.
 */
export const useThreadContactBadges = (threadId: string | null) =>
    useQuery({
        queryKey: [...COMMS_BADGES_KEY, threadId],
        queryFn: () => commsApi.getThreadContactBadges(threadId!),
        enabled: threadId !== null,
        staleTime: 60_000,
    });

/** Pozostałe rozmowy z tym adresem — pobierane dopiero po otwarciu panelu. */
export const useRelatedThreads = (threadId: string | null, options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: [...COMMS_THREADS_KEY, 'related', threadId],
        queryFn: () => commsApi.getRelatedThreads(threadId!),
        enabled: threadId !== null && (options?.enabled ?? true),
        staleTime: 60_000,
    });

/** Wizytówka kontaktu — pobierana dopiero po otwarciu chmurki. */
export const useContactCard = (email: string | null, options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: [...COMMS_CONTACT_CARD_KEY, email],
        queryFn: () => commsApi.getContactCard(email!),
        enabled: email !== null && (options?.enabled ?? true),
        staleTime: 60_000,
    });

// ── Lead z formularza ────────────────────────────────────────────────────────

/**
 * Oznaczeni nadawcy-formularze. Jedna krótka lista na całą skrzynkę, z cache —
 * czyta ją nagłówek każdej rozmowy, żeby pokazać plakietkę „Formularz".
 */
export const useFormMailSources = () =>
    useQuery({
        queryKey: COMMS_FORM_SOURCES_KEY,
        queryFn: commsApi.getFormSources,
        staleTime: 60_000,
    });

export const useMarkMessageAsFormLead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (messageId: string) => commsApi.markMessageAsFormLead(messageId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COMMS_FORM_SOURCES_KEY });
        },
    });
};

export const useDeactivateFormSource = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (sourceId: string) => commsApi.deactivateFormSource(sourceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COMMS_FORM_SOURCES_KEY });
        },
    });
};

export const useContactNotes = (email: string | null, options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: [...COMMS_NOTES_KEY, 'list', email],
        queryFn: () => commsApi.getNotes(email!),
        enabled: email !== null && (options?.enabled ?? true),
    });

export const useContactNoteHistory = (email: string | null, options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: [...COMMS_NOTES_KEY, 'history', email],
        queryFn: () => commsApi.getNoteHistory(email!),
        enabled: email !== null && (options?.enabled ?? true),
    });

/**
 * Po każdej zmianie notatki odświeżamy listę, historię i plakietkę z licznikiem —
 * licznik pokazujący inną liczbę niż widoczna lista jest gorszy niż brak licznika.
 */
const useNotesInvalidation = () => {
    const queryClient = useQueryClient();
    return (email: string) => {
        queryClient.invalidateQueries({ queryKey: [...COMMS_NOTES_KEY, 'list', email] });
        queryClient.invalidateQueries({ queryKey: [...COMMS_NOTES_KEY, 'history', email] });
        queryClient.invalidateQueries({ queryKey: COMMS_BADGES_KEY });
    };
};

export const useCreateContactNote = () => {
    const invalidate = useNotesInvalidation();
    return useMutation({
        mutationFn: ({ email, body }: { email: string; body: string }) =>
            commsApi.createNote(email, body),
        onSuccess: (_note, variables) => invalidate(variables.email),
    });
};

export const useUpdateContactNote = () => {
    const invalidate = useNotesInvalidation();
    return useMutation({
        mutationFn: ({ noteId, body }: { email: string; noteId: string; body: string }) =>
            commsApi.updateNote(noteId, body),
        onSuccess: (_note, variables) => invalidate(variables.email),
    });
};

export const useDeleteContactNote = () => {
    const invalidate = useNotesInvalidation();
    return useMutation({
        mutationFn: ({ noteId }: { email: string; noteId: string }) => commsApi.deleteNote(noteId),
        onSuccess: (_result, variables) => invalidate(variables.email),
    });
};

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
        mutationFn: ({
            onUploadProgress,
            ...request
        }: SendMailRequest & { onUploadProgress?: (fraction: number) => void }) =>
            commsApi.send(request, onUploadProgress),
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

/** Najwyżej jedno powiadomienie „Nowa wiadomość" na tyle milisekund. */
const NEW_MAIL_TOAST_THROTTLE_MS = 15_000;

/**
 * Subskrypcja zdarzeń komunikacji na topicu dashboardu. Payloady niosą tylko id —
 * po zdarzeniu odświeżamy dane przez REST, więc cache nigdy nie rozjeżdża się
 * z serwerem, a utracone podczas rozłączenia zdarzenia nadrabia refetch po reconnable.
 */
export function useCommsSocket(): void {
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();
    const { showInfo } = useToast();
    // Jedna paczka poczty (sync co 3 minuty po nocy) to jedno powiadomienie, nie
    // dziesięć. Toast mówi „zajrzyj do skrzynki" — drugi w tej samej minucie nie
    // niesie żadnej nowej informacji, tylko frustrację.
    const lastNewMailToastAt = useRef(0);

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
                    if (payload.newMessage && Date.now() - lastNewMailToastAt.current > NEW_MAIL_TOAST_THROTTLE_MS) {
                        lastNewMailToastAt.current = Date.now();
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

/** Korekta językowa treści wiadomości — świadomy krok użytkownika, nie automat. */
export const useProofread = () =>
    useMutation({
        mutationFn: ({ text, format }: { text: string; format?: 'text' | 'html' }) =>
            commsApi.proofread(text, format),
    });

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
