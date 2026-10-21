// @vitest-environment jsdom
//
// Pulpit nie odpytuje serwera co 30 s. Zmiany wizyt i rezerwacji przychodzą pushem
// (useScheduleSocket), a panel „Nadchodzące" bierze z serwera tylko tyle pozycji, ile pokazuje.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core', () => ({ apiClient: http }));

import { useDashboard } from './useDashboard';
import { UPCOMING_LIMIT, useUpcomingVisits } from './useUpcomingVisits';

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('pulpit', () => {
    it('kafelki stanu: jedno pobranie, bez pollingu', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        http.get.mockResolvedValue({ data: { stats: { inProgress: 1 } } });
        const { result } = renderHook(() => useDashboard(), { wrapper });
        await waitFor(() => expect(result.current.stats?.inProgress).toBe(1));

        await vi.advanceTimersByTimeAsync(5 * 60_000);

        expect(http.get).toHaveBeenCalledTimes(1);
        expect(http.get).toHaveBeenCalledWith('/v1/dashboard/stats');
    });

    it('„Nadchodzące" pyta o tyle pozycji, ile pokazuje', async () => {
        http.get.mockResolvedValue({ data: { appointments: [], visits: [] } });
        renderHook(() => useUpcomingVisits(), { wrapper });

        await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));
        expect(http.get.mock.calls[0][1].params.limit).toBe(UPCOMING_LIMIT);
    });
});
