// @vitest-environment jsdom
//
// „Zaplanowane SMS-y": kampania jako jeden wiersz, anulowany SMS zostaje na liście
// i można go wznowić, a zmiana treści i terminu idzie do serwera jako instant.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { scheduledSmsApi } from '../api/scheduledSmsApi';
import type { ScheduledSmsItem, ScheduledSmsOverview } from '../types';
import { ScheduledSmsView } from './ScheduledSmsView';

vi.mock('../api/scheduledSmsApi', () => ({
    scheduledSmsApi: { list: vi.fn(), update: vi.fn(), cancel: vi.fn(), resume: vi.fn() },
}));

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const item = (over: Partial<ScheduledSmsItem>): ScheduledSmsItem => ({
    source: 'PRE_VISIT', id: 'a1', kindLabel: 'Przypomnienie przed wizytą', waitingReason: 'Automat: 1 dzień przed wizytą',
    state: 'PENDING', scheduledFor: inHours(5), messageContent: 'Przypominamy o jutrzejszej wizycie', customerId: 'c1',
    customerName: 'Anna Kowalska', phoneNumber: '+48534920205', visitId: null, appointmentId: 'a1',
    appointmentStart: inHours(29), cancelledAt: null, editable: true, cancellable: true, resumable: false, campaign: null,
    ...over,
});

const reminder = item({});
const campaign = item({
    source: 'CAMPAIGN', id: 'k1', kindLabel: 'Kampania SMS', waitingReason: 'Wysyłka kampanii trwa',
    scheduledFor: inHours(6), customerId: null, customerName: null, phoneNumber: null, appointmentId: null,
    appointmentStart: null, editable: false, cancellable: false,
    campaign: { id: 'k1', name: 'Jesienny przegląd', status: 'SENDING', pendingCount: 120 },
});
const cancelled = item({
    source: 'QUEUE', id: 'q1', kindLabel: 'SMS z potwierdzeniem rezerwacji', state: 'CANCELLED',
    customerName: 'Jan Nowak', cancelledAt: inHours(-1), editable: false, cancellable: false, resumable: true,
    appointmentStart: null,
});

const overview = (items: ScheduledSmsItem[]): ScheduledSmsOverview => ({
    items, sendWindowOpensAt: '12:00', sendWindowClosesAt: '18:00', horizonEnd: inHours(24 * 30),
});

const renderView = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <ScheduledSmsView />
                    </ToastProvider>
                </ThemeProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    vi.mocked(scheduledSmsApi.list).mockResolvedValue(overview([reminder, campaign, cancelled]));
    vi.mocked(scheduledSmsApi.update).mockResolvedValue();
    vi.mocked(scheduledSmsApi.cancel).mockResolvedValue();
    vi.mocked(scheduledSmsApi.resume).mockResolvedValue();
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const rows = () => screen.getAllByTestId('scheduled-sms-row');

describe('ScheduledSmsView', () => {
    it('kampania jest jednym wierszem z liczbą SMS-ów i bez akcji na pojedynczym SMS-ie', async () => {
        renderView();

        await screen.findByText('Kampania Jesienny przegląd');
        expect(rows()).toHaveLength(2);
        const campaignRow = rows().find(r => r.textContent?.includes('Jesienny przegląd'))!;
        expect(within(campaignRow).getByText('120 SMS-ów czeka')).toBeTruthy();
        expect(within(campaignRow).queryByRole('button', { name: 'Zmień' })).toBeNull();
        expect(within(campaignRow).queryByRole('button', { name: 'Anuluj wysyłkę' })).toBeNull();
        expect(within(campaignRow).getByRole('link', { name: 'Otwórz kampanię' }).getAttribute('href')).toBe('/campaigns/k1');
    });

    it('lista nie ma wypełnionego przycisku i nie skleja faktów kropką', async () => {
        renderView();
        await screen.findByText('Anna Kowalska');

        expect(document.querySelectorAll('[data-variant="primary"], [data-variant="success"]')).toHaveLength(0);
        expect(document.body.textContent).not.toMatch(/[·•]/);
    });

    it('anulowanie pyta o potwierdzenie i wysyła SMS do anulowania', async () => {
        renderView();
        await screen.findByText('Anna Kowalska');

        const row = rows().find(r => r.textContent?.includes('Anna Kowalska'))!;
        fireEvent.click(within(row).getByRole('button', { name: 'Anuluj wysyłkę' }));
        const dialog = await screen.findByText('Anulować wysyłkę?');
        expect(dialog).toBeTruthy();
        const confirmButtons = screen.getAllByRole('button', { name: 'Anuluj wysyłkę' });
        fireEvent.click(confirmButtons[confirmButtons.length - 1]);

        await waitFor(() => expect(scheduledSmsApi.cancel).toHaveBeenCalledWith(reminder));
    });

    it('anulowany SMS zostaje w zakładce „Anulowane" i można go wznowić', async () => {
        renderView();
        await screen.findByText('Anna Kowalska');

        fireEvent.click(screen.getByRole('button', { name: /Anulowane/ }));
        const row = (await screen.findByText('Jan Nowak')).closest('li')!;
        expect(within(row).getByText('Anulowany')).toBeTruthy();
        fireEvent.click(within(row).getByRole('button', { name: 'Wznów wysyłkę' }));

        await waitFor(() => expect(scheduledSmsApi.resume).toHaveBeenCalledWith(cancelled));
    });

    it('zmiana treści wysyła nową treść i termin jako instant', async () => {
        renderView();
        await screen.findByText('Anna Kowalska');

        const row = rows().find(r => r.textContent?.includes('Anna Kowalska'))!;
        fireEvent.click(within(row).getByRole('button', { name: 'Zmień' }));
        const textarea = await screen.findByLabelText('Treść');
        fireEvent.change(textarea, { target: { value: '  Do zobaczenia jutro o 10:00  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

        await waitFor(() => expect(scheduledSmsApi.update).toHaveBeenCalled());
        const [sent, payload] = vi.mocked(scheduledSmsApi.update).mock.calls[0];
        expect(sent).toBe(reminder);
        expect(payload.messageContent).toBe('Do zobaczenia jutro o 10:00');
        // Termin z pickera (czas ścienny, co do minuty) wraca jako instant tej samej minuty.
        expect(payload.scheduledFor).toMatch(/Z$/);
        expect(Math.abs(Date.parse(payload.scheduledFor) - Date.parse(reminder.scheduledFor!))).toBeLessThan(60_000);
    });
});
