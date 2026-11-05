// @vitest-environment jsdom
//
// Audyt 05.11: każda odmowa 422 dawała dymek „Nie masz sparowanego telefonu”, także gdy
// telefon był sparowany, tylko miał wyłączone „Dzwonienie z komputera”.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';

const toast = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn(), showInfo: vi.fn() }));
vi.mock('@/common/components/Toast', () => ({ useToast: () => toast }));
const api = vi.hoisted(() => ({ requestCall: vi.fn() }));
vi.mock('../api/pushApi', () => ({ pushApi: api }));

import { useClickToCall } from './useClickToCall';

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>
);

const refusal = (detail?: string) => new AxiosError('422', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 422, statusText: '', headers: {}, config: { headers: new AxiosHeaders() },
    data: detail ? { status: 422, detail } : {},
});

describe('useClickToCall', () => {
    beforeEach(() => vi.clearAllMocks());

    it('pokazuje powód odmowy z serwera', async () => {
        const reason = 'Na sparowanym telefonie jest wyłączone „Dzwonienie z komputera”. Włącz je w Ustawieniach → Telefon → Powiadomienia, w tabeli „Rodzaje powiadomień”.';
        api.requestCall.mockRejectedValue(refusal(reason));
        const { result } = renderHook(() => useClickToCall(), { wrapper });

        act(() => result.current.requestCall('+48600123456', 'Anna Nowak'));

        await waitFor(() => expect(toast.showInfo).toHaveBeenCalledWith(reason));
    });

    it('bez powodu z serwera zostaje podpowiedź o parowaniu', async () => {
        api.requestCall.mockRejectedValue(refusal());
        const { result } = renderHook(() => useClickToCall(), { wrapper });

        act(() => result.current.requestCall('+48600123456'));

        await waitFor(() => expect(toast.showInfo).toHaveBeenCalledWith(expect.stringMatching(/^Nie masz sparowanego telefonu/)));
    });
});
