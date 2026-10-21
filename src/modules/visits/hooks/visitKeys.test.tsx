// @vitest-environment jsdom
//
// Zmiana tytułu wizyty to 1 PATCH i 1 GET. Szczegóły leżały pod `['visit', id]`, który jest
// prefiksem wszystkich zakładek karty, więc każda zmiana pola odświeżała też dokumenty,
// zdjęcia, komentarze i komunikację - około 6 zapytań zamiast jednego.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({ updateTitle: vi.fn() }));
vi.mock('../api/visitApi', () => ({ visitApi: api }));
vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showInfo: vi.fn(), showWarning: vi.fn() }),
}));

import { useUpdateVisitTitle, visitKeys } from './index';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const TABS = ['detail', 'documents', 'photos', 'comments', 'communication'] as const;

describe('visitKeys', () => {
    it('zmiana tytułu odświeża tylko szczegóły wizyty', async () => {
        api.updateTitle.mockResolvedValue(undefined);
        const fetched = Object.fromEntries(TABS.map(tab => [tab, vi.fn(async () => ({}))]));
        const client = new QueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => {
            const tabs = TABS.map(tab => useQuery({ queryKey: visitKeys[tab]('v1'), queryFn: fetched[tab] }));
            return { tabs, title: useUpdateVisitTitle('v1') };
        }, { wrapper });
        await waitFor(() => expect(result.current.tabs.every(tab => tab.isSuccess)).toBe(true));

        await act(() => result.current.title.updateTitle('Nowy tytuł'));
        await waitFor(() => expect(fetched.detail).toHaveBeenCalledTimes(2));
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(api.updateTitle).toHaveBeenCalledTimes(1);
        for (const tab of TABS.filter(t => t !== 'detail')) expect(fetched[tab], tab).toHaveBeenCalledTimes(1);
    });
});
