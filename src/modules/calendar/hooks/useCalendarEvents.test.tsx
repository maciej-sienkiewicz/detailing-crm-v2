// @vitest-environment jsdom
//
// Przewinięcie kalendarza dalej, zanim przyszła odpowiedź, anuluje poprzedni zakres.
// Bez sygnału każde kliknięcie „następny tydzień" zostawiało w sieci pełne pobranie
// tygodnia, którego nikt już nie ogląda, a przy wolnym łączu odpowiedzi szły kolejką.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { DateRange } from '../types';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core', () => ({ apiClient: http }));

import { useCalendarEvents } from './useCalendarEvents';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const signalOf = (call: number) => (http.get.mock.calls[call][1] as { signal: AbortSignal }).signal;

describe('useCalendarEvents', () => {
    it('anuluje pobranie zakresu, który użytkownik już przewinął', async () => {
        http.get.mockImplementation(() => new Promise(() => {}));
        const client = new QueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { rerender } = renderHook(
            ({ range }: { range: DateRange }) => useCalendarEvents(range, ['CREATED'], ['IN_PROGRESS']),
            { wrapper, initialProps: { range: { start: '2026-10-19', end: '2026-10-25' } } },
        );
        await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));

        rerender({ range: { start: '2026-10-26', end: '2026-11-01' } });
        await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));

        expect(signalOf(0).aborted).toBe(true);
        expect(signalOf(1).aborted).toBe(false);
    });
});
