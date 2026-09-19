// @vitest-environment jsdom
//
// „Oznacz ostatnią jako nieprzeczytaną" klikane na WĄTKU, z listy rozmów.
//
// Reguła, o którą tu chodzi: licznik rośnie o JEDEN, bo cofamy jedną wiadomość -
// najnowszą od klienta - a nie całą rozmowę. Druga reguła jest o uczciwości wobec
// serwera: gdy odpowie „nie było czego cofać", optymistyczna jedynka nie może
// zostać na ekranie.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarkThreadUnread, COMMS_THREADS_KEY } from './useComms';
import { commsApi } from '../api/commsApi';
import type { CommThreadPage } from '../types';

const THREAD_ID = 'thread-1';
const OTHER_THREAD_ID = 'thread-2';

vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showInfo: vi.fn() }) }));
vi.mock('@/core', () => ({ useAuth: () => ({ isAuthenticated: false, user: null }) }));
vi.mock('@/core/socketClient', () => ({
    subscribeToTopic: () => () => {},
    onSocketConnect: () => () => {},
}));
vi.mock('../api/commsApi', () => ({
    commsApi: { markThreadUnread: vi.fn() },
}));

const listKey = [...COMMS_THREADS_KEY, 'list', {}];

const listPage = (): CommThreadPage => ({
    items: [
        { id: THREAD_ID, unreadCount: 0 } as CommThreadPage['items'][number],
        { id: OTHER_THREAD_ID, unreadCount: 3 } as CommThreadPage['items'][number],
    ],
    totalUnread: 3,
} as CommThreadPage);

const setup = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(listKey, listPage());
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
};

const pageIn = (queryClient: QueryClient) => queryClient.getQueryData<CommThreadPage>(listKey)!;
const threadIn = (queryClient: QueryClient, id: string) => pageIn(queryClient).items.find((i) => i.id === id)!;

describe('useMarkThreadUnread', () => {
    beforeEach(() => vi.clearAllMocks());

    it('podbija licznik rozmowy o jeden, nie o liczbę jej wiadomości', async () => {
        vi.mocked(commsApi.markThreadUnread).mockResolvedValue('msg-9');
        const { queryClient, wrapper } = setup();
        const { result } = renderHook(() => useMarkThreadUnread(), { wrapper });

        result.current.mutate({ threadId: THREAD_ID });

        await waitFor(() => expect(threadIn(queryClient, THREAD_ID).unreadCount).toBe(1));
        expect(pageIn(queryClient).totalUnread).toBe(4);
    });

    it('nie rusza pozostałych rozmów na liście', async () => {
        vi.mocked(commsApi.markThreadUnread).mockResolvedValue('msg-9');
        const { queryClient, wrapper } = setup();
        const { result } = renderHook(() => useMarkThreadUnread(), { wrapper });

        result.current.mutate({ threadId: THREAD_ID });

        await waitFor(() => expect(threadIn(queryClient, THREAD_ID).unreadCount).toBe(1));
        expect(threadIn(queryClient, OTHER_THREAD_ID).unreadCount).toBe(3);
    });

    it('wywołuje serwer dokładnie dla klikniętej rozmowy', async () => {
        vi.mocked(commsApi.markThreadUnread).mockResolvedValue('msg-9');
        const { wrapper } = setup();
        const { result } = renderHook(() => useMarkThreadUnread(), { wrapper });

        result.current.mutate({ threadId: THREAD_ID });

        await waitFor(() => expect(commsApi.markThreadUnread).toHaveBeenCalledWith(THREAD_ID));
    });

    it('gdy serwer nie miał czego cofnąć, optymistyczna jedynka nie zostaje', async () => {
        vi.mocked(commsApi.markThreadUnread).mockResolvedValue(null);
        const { queryClient, wrapper } = setup();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const { result } = renderHook(() => useMarkThreadUnread(), { wrapper });

        result.current.mutate({ threadId: THREAD_ID });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: [...COMMS_THREADS_KEY, 'list'] });
    });

    it('błąd zapisu odświeża listę z serwera', async () => {
        vi.mocked(commsApi.markThreadUnread).mockRejectedValue(new Error('padło'));
        const { queryClient, wrapper } = setup();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const { result } = renderHook(() => useMarkThreadUnread(), { wrapper });

        result.current.mutate({ threadId: THREAD_ID });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: [...COMMS_THREADS_KEY, 'list'] });
    });
});
