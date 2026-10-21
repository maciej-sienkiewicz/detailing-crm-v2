// @vitest-environment jsdom
//
// Kolejka SMS i e-maili odświeża się co minutę tylko dla otwartego kanału; druga zakładka
// bierze z listy sam licznik. Dawniej oba kanały były odpytywane co minutę cały czas.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core', () => ({ apiClient: http }));

import { useScheduledSms } from './useScheduledSms';
import { useScheduledEmail } from './useScheduledEmail';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('kolejka zaplanowanych wiadomości', () => {
    it('odpytuje co minutę tylko otwarty kanał', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        http.get.mockResolvedValue({ data: { items: [] } });
        renderHook(() => ({ sms: useScheduledSms({ poll: true }), email: useScheduledEmail({ poll: false }) }), { wrapper });
        await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));

        await vi.advanceTimersByTimeAsync(60_000);

        const urls = http.get.mock.calls.map(([url]) => url as string);
        expect(urls.filter(url => url.includes('sms'))).toHaveLength(2);
        expect(urls.filter(url => url.includes('email'))).toHaveLength(1);
    });
});
