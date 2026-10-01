// @vitest-environment jsdom
//
// „Zaraportuj 8 godzin" na Tablicy: przycisk znika, gdy i tak skończyłby się błędem -
// karta bieżącego miesiąca jest złożona (czeka na decyzję) albo zatwierdzona, albo konto
// nie liczy czasu pracy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { workTimeApi } from '../api/workTimeApi';
import type { PeriodStatus } from '../types';
import { ReportWorkdayButton } from './ReportWorkdayButton';

const auth = vi.hoisted(() => ({ user: { trackWorkTime: true } as { trackWorkTime: boolean } }));
vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../api/workTimeApi', () => ({ workTimeApi: { getPeriod: vi.fn(), standardToday: vi.fn() } }));

const serve = (status: PeriodStatus) => vi.mocked(workTimeApi.getPeriod).mockResolvedValue({
    period: '2026-10', label: 'Październik 2026', status, totalMinutes: 0, totalHours: '0:00', entryCount: 0,
    returnNote: null, entries: [],
});

const renderButton = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider theme={theme}>
            <ToastProvider>
                <ReportWorkdayButton />
            </ToastProvider>
        </ThemeProvider>
    </QueryClientProvider>,
);

beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { trackWorkTime: true };
});
afterEach(() => cleanup());

describe('ReportWorkdayButton', () => {
    it('karta w trakcie: przycisk jest', async () => {
        serve('DRAFT');
        renderButton();
        const button = await screen.findByRole('button', { name: /Zaraportuj 8 godzin pracy/ });
        await waitFor(() => expect(button).toBeEnabled());
    });

    it.each<PeriodStatus>(['SUBMITTED', 'APPROVED'])('karta %s: przycisku nie ma', async status => {
        serve(status);
        renderButton();
        await waitFor(() => expect(workTimeApi.getPeriod).toHaveBeenCalled());
        await waitFor(() => expect(screen.queryByRole('button')).toBeNull());
    });

    it('konto bez liczonego czasu pracy: nic i bez pytania API', () => {
        auth.user = { trackWorkTime: false };
        renderButton();
        expect(screen.queryByRole('button')).toBeNull();
        expect(workTimeApi.getPeriod).not.toHaveBeenCalled();
    });
});
