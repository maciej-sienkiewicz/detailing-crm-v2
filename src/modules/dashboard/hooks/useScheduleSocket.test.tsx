// @vitest-environment jsdom
//
// SCHEDULE_CHANGED z serwera zastępuje polling pulpitu co 30 s: otwarte widoki wizyt
// i rezerwacji odświeżają się po zmianie, a zapytanie pobrane przed chwilą (autor zapisu
// unieważnił je sam) nie idzie drugi raz.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const socket = vi.hoisted(() => ({ handler: null as null | ((message: { body: string }) => void) }));
vi.mock('@/core/socketClient', () => ({
    subscribeToTopic: (_topic: string, handler: (message: { body: string }) => void) => {
        socket.handler = handler;
        return () => { socket.handler = null; };
    },
    onSocketConnect: () => () => undefined,
}));
vi.mock('@/core', () => ({ useAuth: () => ({ isAuthenticated: true, user: { studioId: 's1' } }) }));

import { useScheduleSocket } from './useScheduleSocket';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

const push = (type: string) => socket.handler?.({ body: JSON.stringify({ type, payload: {} }) });

describe('useScheduleSocket', () => {
    it('zmiana w studiu odświeża otwarty kalendarz, ale nie świeżo pobrany pulpit', async () => {
        const calendar = vi.fn(async () => []);
        const stats = vi.fn(async () => ({}));
        const client = new QueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        renderHook(() => {
            useScheduleSocket();
            useQuery({ queryKey: ['calendar-events', 'week'], queryFn: calendar });
            useQuery({ queryKey: ['dashboard', 'stats'], queryFn: stats });
        }, { wrapper });
        await waitFor(() => expect(calendar).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(stats).toHaveBeenCalledTimes(1));
        // Kalendarz pobrany dawno, pulpit przed chwilą (np. po własnym zapisie).
        client.getQueryCache().find({ queryKey: ['calendar-events', 'week'] })!.state.dataUpdatedAt = Date.now() - 60_000;

        push('COMM_THREAD_UPDATED');
        push('SCHEDULE_CHANGED');

        await waitFor(() => expect(calendar).toHaveBeenCalledTimes(2));
        await new Promise(resolve => setTimeout(resolve, 20));
        expect(stats).toHaveBeenCalledTimes(1);
    });
});
