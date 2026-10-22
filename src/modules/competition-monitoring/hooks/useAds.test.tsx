// @vitest-environment jsdom
//
// Grafika reklamy przy zajętym serwerze. Sidecar ma jedną przeglądarkę; dawniej okno
// odpytywało „zajęty" bez końca i właściciel patrzył na „Wczytuję grafikę reklamy…"
// przez minuty. Teraz czekanie ma limit, a zamknięte okno przestaje pytać.
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';
import { CREATIVE_BUSY_PAUSE_MS, CREATIVE_BUSY_RETRIES, useAdCreative } from './useAds';
import type { AdCreative } from '../types';

vi.mock('../api/instagramApi', () => ({ instagramApi: { getAdCreative: vi.fn() } }));

const BUSY: AdCreative = { status: 'BUSY', media: [] };
const OK: AdCreative = { status: 'OK', media: [{ kind: 'IMAGE', url: 'https://x.fbcdn.net/i.jpg', posterUrl: null }] };

const getAdCreative = vi.mocked(instagramApi.getAdCreative);

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
/** Wynik zapytania dociera do Reacta przez kolejkę powiadomień react-query (setTimeout). */
const flush = () => advance(1);

beforeEach(() => {
    vi.useFakeTimers();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getAdCreative.mockReset();
});

afterEach(() => {
    client.clear();
    vi.useRealTimers();
});

describe('useAdCreative', () => {
    it('zajęty serwer: pyta ponownie po pauzie, do tego czasu trwa wczytywanie', async () => {
        getAdCreative.mockResolvedValueOnce(BUSY).mockResolvedValueOnce(BUSY).mockResolvedValue(OK);
        const { result } = renderHook(() => useAdCreative('1'), { wrapper });

        await advance(CREATIVE_BUSY_PAUSE_MS);
        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBeUndefined();

        await advance(CREATIVE_BUSY_PAUSE_MS);
        await flush();
        expect(getAdCreative).toHaveBeenCalledTimes(3);
        expect(result.current.data).toEqual(OK);
        expect(result.current.isLoading).toBe(false);
    });

    it('serwer zajęty bez końca: po limicie koniec czekania, ponowne otwarcie pyta od nowa', async () => {
        getAdCreative.mockResolvedValue(BUSY);
        const first = renderHook(() => useAdCreative('1'), { wrapper });

        await advance(CREATIVE_BUSY_PAUSE_MS * (CREATIVE_BUSY_RETRIES + 5));
        expect(getAdCreative).toHaveBeenCalledTimes(CREATIVE_BUSY_RETRIES + 1);
        expect(first.result.current.data).toEqual(BUSY);
        expect(first.result.current.isLoading).toBe(false);
        expect(first.result.current.isFetching).toBe(false);
        first.unmount();

        // BUSY nie jest świeży ani chwili - otwarcie tej samej reklamy to nowa próba.
        getAdCreative.mockResolvedValue(OK);
        const second = renderHook(() => useAdCreative('1'), { wrapper });
        await flush();
        expect(getAdCreative).toHaveBeenCalledTimes(CREATIVE_BUSY_RETRIES + 2);
        expect(second.result.current.data).toEqual(OK);
    });

    it('zamknięte okno przestaje pytać', async () => {
        getAdCreative.mockResolvedValue(BUSY);
        const { unmount } = renderHook(() => useAdCreative('1'), { wrapper });
        await flush();
        expect(getAdCreative).toHaveBeenCalledTimes(1);

        unmount();
        await advance(CREATIVE_BUSY_PAUSE_MS * 3);
        expect(getAdCreative).toHaveBeenCalledTimes(1);
    });

    it('wynik inny niż BUSY zostaje w pamięci - ponowne otwarcie nie uruchamia przeglądarki', async () => {
        getAdCreative.mockResolvedValue(OK);
        const first = renderHook(() => useAdCreative('1'), { wrapper });
        await flush();
        first.unmount();

        const second = renderHook(() => useAdCreative('1'), { wrapper });
        await flush();
        expect(getAdCreative).toHaveBeenCalledTimes(1);
        expect(second.result.current.data).toEqual(OK);
    });
});
