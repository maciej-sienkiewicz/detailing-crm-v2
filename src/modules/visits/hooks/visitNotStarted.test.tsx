// @vitest-environment jsdom
//
// Szkic przyjęcia serwer zgłasza jako konflikt stanu (409 VISIT_NOT_STARTED), a nie 404:
// rekord istnieje. Karta pokazuje wtedy „dokończ przyjęcie" i nie ponawia zapytania.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({ getVisitDetail: vi.fn() }));
vi.mock('../api/visitApi', () => ({ visitApi: api }));
vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showInfo: vi.fn(), showWarning: vi.fn() }),
}));

import { useVisitDetail } from './index';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useVisitDetail - nierozpoczęta wizyta', () => {
    it('409 VISIT_NOT_STARTED to stan „nierozpoczęta", bez ponawiania', async () => {
        api.getVisitDetail.mockRejectedValue({ response: { status: 409, data: { code: 'VISIT_NOT_STARTED', visitId: 'v1' } } });
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
        );

        const { result } = renderHook(() => useVisitDetail('v1'), { wrapper });

        await waitFor(() => expect(result.current.notStarted).toBe(true));
        expect(api.getVisitDetail).toHaveBeenCalledTimes(1);
    });
});
