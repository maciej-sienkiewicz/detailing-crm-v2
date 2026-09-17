// @vitest-environment jsdom
//
// „Oznacz jako nieprzeczytaną" ma dać natychmiastową reakcję (bez czekania na
// odświeżenie z serwera): wiadomość wraca do nieprzeczytanej, a licznik wątku rośnie
// o jeden w szczegółach, na liście i w sumie nieprzeczytanych.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarkMessageUnread, COMMS_THREADS_KEY } from './useComms';
import { commsApi } from '../api/commsApi';
import type { CommThreadDetail, CommThreadPage } from '../types';

const THREAD_ID = 'thread-1';
const MESSAGE_ID = 'msg-1';

vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showInfo: vi.fn() }) }));
vi.mock('@/core', () => ({ useAuth: () => ({ isAuthenticated: false, user: null }) }));
vi.mock('@/core/socketClient', () => ({
    subscribeToTopic: () => () => {},
    onSocketConnect: () => () => {},
}));
vi.mock('../api/commsApi', () => ({
    commsApi: { markMessageUnread: vi.fn().mockResolvedValue(undefined) },
}));

const detailKey = [...COMMS_THREADS_KEY, 'detail', THREAD_ID];
const listKey = [...COMMS_THREADS_KEY, 'list', {}];

const detail = (): CommThreadDetail => ({
    thread: { id: THREAD_ID, unreadCount: 0 } as CommThreadDetail['thread'],
    messages: [
        { id: MESSAGE_ID, threadId: THREAD_ID, direction: 'INBOUND', isRead: true, readSource: 'CRM', readAt: '2026-09-17T09:00:00Z' } as CommThreadDetail['messages'][number],
    ],
});

const listPage = (): CommThreadPage => ({
    items: [{ id: THREAD_ID, unreadCount: 0 } as CommThreadPage['items'][number]],
    totalUnread: 0,
} as CommThreadPage);

const setup = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(detailKey, detail());
    queryClient.setQueryData(listKey, listPage());
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
};

describe('useMarkMessageUnread', () => {
    beforeEach(() => vi.clearAllMocks());

    it('optymistycznie cofa wiadomość do nieprzeczytanej i podbija liczniki', async () => {
        const { queryClient, wrapper } = setup();
        const { result } = renderHook(() => useMarkMessageUnread(), { wrapper });

        result.current.mutate({ messageId: MESSAGE_ID, threadId: THREAD_ID });

        await waitFor(() => {
            const d = queryClient.getQueryData<CommThreadDetail>(detailKey)!;
            expect(d.messages[0].isRead).toBe(false);
        });

        const d = queryClient.getQueryData<CommThreadDetail>(detailKey)!;
        expect(d.messages[0].readSource).toBeNull();
        expect(d.thread.unreadCount).toBe(1);

        const page = queryClient.getQueryData<CommThreadPage>(listKey)!;
        expect(page.items[0].unreadCount).toBe(1);
        expect(page.totalUnread).toBe(1);

        expect(commsApi.markMessageUnread).toHaveBeenCalledWith(MESSAGE_ID);
    });

    it('nie zmienia już nieprzeczytanej wiadomości (idempotencja)', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData<CommThreadDetail>(detailKey, (old) =>
            old && { ...old, messages: old.messages.map((m) => ({ ...m, isRead: false })) }
        );
        const { result } = renderHook(() => useMarkMessageUnread(), { wrapper });

        result.current.mutate({ messageId: MESSAGE_ID, threadId: THREAD_ID });
        await waitFor(() => expect(commsApi.markMessageUnread).toHaveBeenCalled());

        // Detal bez zmian licznika (wiadomość i tak była nieprzeczytana).
        expect(queryClient.getQueryData<CommThreadDetail>(detailKey)!.thread.unreadCount).toBe(0);
    });
});
