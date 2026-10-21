// @vitest-environment jsdom
//
// Plakietki menu, dolnej nawigacji i zakładek to jedno GET /v1/me/badges. Dawniej Sidebar
// wysyłał pięć zapytań, w tym stronę wątków tylko po `totalUnread` i sto list obecności.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core/apiClient', () => ({ apiClient: http }));
const auth = vi.hoisted(() => ({ user: { permissions: null as string[] | null } }));
vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => auth }));

import { useBadge } from './useBadge';
import { adjustBadge } from './badgesQuery';

const BADGES = { leadsAttention: 3, unreadMail: 5, pendingLeaveRequests: 1, pendingWorkTimeCards: 2, pendingAttendanceSheets: 0 };

const setup = () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const view = renderHook(() => ({
        leads: useBadge('leadsAttention'),
        mail: useBadge('unreadMail'),
        leave: useBadge('pendingLeaveRequests'),
        cards: useBadge('pendingWorkTimeCards'),
    }), { wrapper });
    return { client, ...view };
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    auth.user = { permissions: null };
});

describe('useBadge', () => {
    it('wszystkie liczniki z jednego zapytania', async () => {
        http.get.mockResolvedValue({ data: BADGES });
        const { result } = setup();

        await waitFor(() => expect(result.current).toEqual({ leads: 3, mail: 5, leave: 1, cards: 2 }));
        expect(http.get).toHaveBeenCalledTimes(1);
        expect(http.get.mock.calls[0][0]).toBe('/v1/me/badges');
    });

    it('rola bez żadnego modułu z plakietką nie pyta wcale', async () => {
        auth.user = { permissions: ['VISITS_VIEW'] };
        const { result } = setup();

        await new Promise(resolve => setTimeout(resolve, 20));
        expect(result.current.leads).toBe(0);
        expect(http.get).not.toHaveBeenCalled();
    });

    it('przeczytany wątek zdejmuje licznik od razu, bez czekania na serwer', async () => {
        http.get.mockResolvedValue({ data: BADGES });
        const { client, result } = setup();
        await waitFor(() => expect(result.current.mail).toBe(5));

        act(() => { adjustBadge(client, 'unreadMail', -2); });

        await waitFor(() => expect(result.current.mail).toBe(3));
        expect(http.get).toHaveBeenCalledTimes(1);
    });
});
