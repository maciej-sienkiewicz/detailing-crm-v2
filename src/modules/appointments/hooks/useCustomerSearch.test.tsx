// @vitest-environment jsdom
//
// Kolejna litera w wyszukiwarce klienta anuluje zapytanie o poprzednią frazę - inaczej
// wolniejsza, starsza odpowiedź mogła przyjść po nowszej i zostać w cache bez sensu.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core', () => ({ apiClient: http }));

import { useCustomerSearch } from './useAppointmentForm';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useCustomerSearch', () => {
    it('anuluje wyszukiwanie poprzedniej frazy', async () => {
        http.get.mockImplementation(() => new Promise(() => {}));
        const client = new QueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { rerender } = renderHook(({ query }: { query: string }) => useCustomerSearch(query), {
            wrapper,
            initialProps: { query: 'Kow' },
        });
        await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));

        rerender({ query: 'Kowal' });
        await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));

        const [first, second] = http.get.mock.calls.map(call => (call[1] as { signal: AbortSignal }).signal);
        expect(first.aborted).toBe(true);
        expect(second.aborted).toBe(false);
    });
});
