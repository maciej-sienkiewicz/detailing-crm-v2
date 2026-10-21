// @vitest-environment jsdom
//
// Zmiana pakietu odpowiada nowymi uprawnieniami - te trafiają do cache wprost, bez drugiego
// GET /v1/me/entitlements po każdym zapisie.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({ getEntitlements: vi.fn(), changePlan: vi.fn() }));
vi.mock('./subscriptionApi', () => ({ newSubscriptionApi: api }));

import { useChangePlan, useEntitlements } from './subscriptionQueries';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useChangePlan', () => {
    it('kładzie uprawnienia z odpowiedzi do cache zamiast pobierać je ponownie', async () => {
        api.getEntitlements.mockResolvedValue({ plan: 'PRO' });
        api.changePlan.mockResolvedValue({ plan: 'START' });
        const client = new QueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => ({ entitlements: useEntitlements(), change: useChangePlan() }), { wrapper });
        await waitFor(() => expect(result.current.entitlements.data).toEqual({ plan: 'PRO' }));

        await act(() => result.current.change.mutateAsync('START' as never));

        await waitFor(() => expect(result.current.entitlements.data).toEqual({ plan: 'START' }));
        expect(api.getEntitlements).toHaveBeenCalledTimes(1);
    });
});
