// @vitest-environment jsdom
//
// Kolejka „otwartych" to jedno zapytanie z listą statusów i porządkiem serwera. Dawniej
// osobno o NEW, IN_PROGRESS i CONFIRMED (i trzy razy o archiwum), sklejane w przeglądarce.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core/apiClient', () => ({ apiClient: http }));
vi.mock('@/core', () => ({ apiClient: http, useAuth: () => ({ isAuthenticated: false, user: null }) }));

import { OPEN_LEAD_STATUSES, useLeadsByStatuses } from './useLeads';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useLeadsByStatuses', () => {
    it('otwarte sprawy jednym zapytaniem z listą statusów', async () => {
        http.get.mockResolvedValue({ data: { items: [{ id: 'l1' }], total: 1, page: 0, pageSize: 100 } });
        const { result } = renderHook(() => useLeadsByStatuses(OPEN_LEAD_STATUSES, { sortDirection: 'ASC' }), { wrapper });

        await waitFor(() => expect(result.current.items).toHaveLength(1));
        expect(http.get).toHaveBeenCalledTimes(1);
        const url = new URL(`http://x${http.get.mock.calls[0][0]}`);
        expect(url.pathname).toBe('/v1/leads');
        expect(url.searchParams.get('status')).toBe('NEW,IN_PROGRESS,CONFIRMED');
        expect(url.searchParams.get('sortDirection')).toBe('ASC');
        expect(result.current.truncated).toBe(false);
    });

    it('wynik większy niż strona jest oznaczony jako niepełny', async () => {
        http.get.mockResolvedValue({ data: { items: [{ id: 'l1' }], total: 140, page: 0, pageSize: 100 } });
        const { result } = renderHook(() => useLeadsByStatuses(['COMPLETED']), { wrapper });

        await waitFor(() => expect(result.current.truncated).toBe(true));
    });

    it('pusta lista statusów nie pyta serwera', async () => {
        const { result } = renderHook(() => useLeadsByStatuses([]), { wrapper });

        await new Promise(resolve => setTimeout(resolve, 20));
        expect(http.get).not.toHaveBeenCalled();
        expect(result.current.isLoading).toBe(false);
    });
});
