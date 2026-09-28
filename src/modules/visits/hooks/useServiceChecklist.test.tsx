// @vitest-environment jsdom
//
// Na tablecie na hali odhaczenie musi pokazać się od razu (inaczej drugie stuknięcie
// je odznacza), a błąd zapisu - cofnąć znak, zamiast udawać, że się udało.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useServiceChecklist } from './useServiceChecklist';
import { serviceChecksApi } from '../api/serviceChecksApi';

const showError = vi.fn();
let checklistEnabled = true;

vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showError }) }));
vi.mock('@/modules/settings/hooks/useCompany', () => ({
    useVisitViewConfig: () => ({ config: { serviceChecklistEnabled: checklistEnabled }, isLoading: false }),
}));
vi.mock('../api/serviceChecksApi', () => ({ serviceChecksApi: { list: vi.fn(), set: vi.fn() } }));

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

beforeEach(() => {
    checklistEnabled = true;
    vi.mocked(serviceChecksApi.list).mockResolvedValue([]);
});
afterEach(() => vi.clearAllMocks());

describe('useServiceChecklist', () => {
    it('wyłączone w ustawieniach albo na wizycie zakończonej - bez pól i bez zapytań', () => {
        checklistEnabled = false;
        const { result } = renderHook(() => useServiceChecklist('v-1', 'IN_PROGRESS'), { wrapper });
        expect(result.current.enabled).toBe(false);

        checklistEnabled = true;
        const completed = renderHook(() => useServiceChecklist('v-1', 'COMPLETED'), { wrapper });
        expect(completed.result.current.enabled).toBe(false);
        expect(serviceChecksApi.list).not.toHaveBeenCalled();
    });

    it('odhaczenie widać od razu, zanim odpowie serwer', async () => {
        vi.mocked(serviceChecksApi.set).mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useServiceChecklist('v-1', 'IN_PROGRESS'), { wrapper });
        await waitFor(() => expect(serviceChecksApi.list).toHaveBeenCalled());

        act(() => result.current.toggle('s-1', true));

        await waitFor(() => expect(result.current.checkOf('s-1')).toBeDefined());
        expect(serviceChecksApi.set).toHaveBeenCalledWith('v-1', 's-1', true);
    });

    it('błąd zapisu cofa znak i mówi o tym', async () => {
        vi.mocked(serviceChecksApi.set).mockRejectedValue(new Error('offline'));
        const { result } = renderHook(() => useServiceChecklist('v-1', 'READY_FOR_PICKUP'), { wrapper });
        await waitFor(() => expect(serviceChecksApi.list).toHaveBeenCalled());

        act(() => result.current.toggle('s-1', true));

        await waitFor(() => expect(showError).toHaveBeenCalled());
        await waitFor(() => expect(result.current.checkOf('s-1')).toBeUndefined());
    });
});
