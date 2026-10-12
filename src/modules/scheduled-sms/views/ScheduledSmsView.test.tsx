// @vitest-environment jsdom
//
// „Zaplanowane SMS-y": kampania jako jeden wiersz, anulowanie przez okno potwierdzenia,
// anulowany SMS w chipie „Anulowane" z wznowieniem, a zmiana treści i terminu wysyła
// do serwera instant - tak jak na liście wizyt: menu „⋮" i okna ModalShell.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { scheduledSmsApi } from '../api/scheduledSmsApi';
import type { ScheduledSmsItem, ScheduledSmsOverview, SentSmsItem } from '../types';
import { ScheduledSmsView } from './ScheduledSmsView';

vi.mock('../api/scheduledSmsApi', () => ({
    scheduledSmsApi: { list: vi.fn(), sent: vi.fn(), update: vi.fn(), cancel: vi.fn(), resume: vi.fn() },
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
    campaign: { id: 'k1', name: 'Jesienny przegląd', status: 'SENDING', pendingCount: 124 },
});
const cancelled = item({
    source: 'QUEUE', id: 'q1', kindLabel: 'SMS z potwierdzeniem rezerwacji', state: 'CANCELLED',
    customerName: 'Jan Nowak', cancelledAt: inHours(-1), editable: false, cancellable: false, resumable: true,
    appointmentStart: null,
});

const sentBase: SentSmsItem = {
    id: 'l1', sentAt: inHours(-1), status: 'SENT', kindLabel: 'Przypomnienie SMS przed wizytą',
    messageContent: 'Przypominamy o wizycie', customerId: 'c1', customerName: 'Ola Wrona', phoneNumber: '+48600100200',
    visitId: null, appointmentId: 'a5', errorMessage: null, campaign: null,
};
const sentReminder = sentBase;
const olderCursor = inHours(-48);
const sentFailed: SentSmsItem = { ...sentBase, id: 'l2', customerName: 'Kamil Bąk', status: 'FAILED', errorMessage: 'Brak kredytów SMS' };
const sentCampaign: SentSmsItem = {
    ...sentBase, id: 'k9', customerId: null, customerName: null, phoneNumber: null, kindLabel: 'Kampania SMS',
    campaign: { id: 'k9', name: 'Wiosenne mycie', sentCount: 87, failedCount: 0 },
};

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
    // jsdom nie ma matchMedia; widok pyta o nią przez useBreakpoint (nagłówek komputer / telefon).
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true, media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
    vi.mocked(scheduledSmsApi.list).mockResolvedValue(overview([reminder, campaign, cancelled]));
    vi.mocked(scheduledSmsApi.sent).mockResolvedValue({ items: [sentReminder, sentFailed, sentCampaign], nextBefore: olderCursor });
    vi.mocked(scheduledSmsApi.update).mockResolvedValue();
    vi.mocked(scheduledSmsApi.cancel).mockResolvedValue();
    vi.mocked(scheduledSmsApi.resume).mockResolvedValue();
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const rowOf = async (text: string) => (await screen.findByText(text)).closest('[data-testid="scheduled-sms-row"]') as HTMLElement;

// Menu w portalu czeka niewidoczne na pomiar, którego jsdom nie robi, więc pozycji
// menu szukamy po tekście - dostępna nazwa elementu ukrytego jest pusta.
const menuItem = (name: string) => screen.getByText(name, { selector: '[role="menuitem"]' });

const openMenu = (row: HTMLElement) => fireEvent.click(within(row).getByRole('button', { name: 'Akcje' }));

describe('ScheduledSmsView', () => {
    it('kampania jest jednym wierszem z liczbą SMS-ów, bez zmiany i anulowania', async () => {
        renderView();

        const row = await rowOf('Kampania Jesienny przegląd');
        expect(screen.getAllByTestId('scheduled-sms-row')).toHaveLength(2);
        expect(within(row).getByText('124 SMS-y czekają')).toBeTruthy();
        openMenu(row);
        expect(menuItem('Otwórz kampanię')).toBeTruthy();
        expect(screen.queryByText('Zmień treść i termin', { selector: '[role="menuitem"]' })).toBeNull();
        expect(screen.queryByText('Anuluj wysyłkę', { selector: '[role="menuitem"]' })).toBeNull();
    });

    it('nie skleja faktów kropką', async () => {
        renderView();
        await rowOf('Anna Kowalska');
        expect(document.body.textContent).not.toMatch(/[·•]/);
    });

    it('anulowanie idzie przez okno potwierdzenia', async () => {
        renderView();
        openMenu(await rowOf('Anna Kowalska'));
        fireEvent.click(menuItem('Anuluj wysyłkę'));

        expect(await screen.findByText('Anuluj wysyłkę SMS-a')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Anuluj wysyłkę' }));

        await waitFor(() => expect(scheduledSmsApi.cancel).toHaveBeenCalledWith(reminder));
    });

    it('anulowany SMS jest w chipie „Anulowane" i można go wznowić', async () => {
        renderView();
        await rowOf('Anna Kowalska');

        fireEvent.click(screen.getByRole('tab', { name: /Anulowane/ }));
        const row = await rowOf('Jan Nowak');
        expect(screen.queryByText('Anna Kowalska')).toBeNull();
        openMenu(row);
        fireEvent.click(menuItem('Wznów wysyłkę'));

        await waitFor(() => expect(scheduledSmsApi.resume).toHaveBeenCalledWith(cancelled));
    });

    it('nad listą nie ma chipów filtrów, tylko zakładki i szukanie', async () => {
        renderView();
        await rowOf('Anna Kowalska');

        expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(['Zaplanowane2', 'Anulowane1', 'Wysłane']);
        expect(screen.queryByRole('button', { name: 'Kampanie' })).toBeNull();

        fireEvent.change(screen.getByLabelText('Szukaj'), { target: { value: 'kowal' } });
        expect(screen.getAllByTestId('scheduled-sms-row')).toHaveLength(1);
    });

    it('zakładka „Wysłane" pokazuje historię z wynikiem i kampanię jednym wierszem', async () => {
        renderView();
        await rowOf('Anna Kowalska');
        expect(scheduledSmsApi.sent).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('tab', { name: 'Wysłane' }));

        const failedRow = (await screen.findByText('Kamil Bąk')).closest('[data-testid="sent-sms-row"]') as HTMLElement;
        expect(within(failedRow).getByText('Nie wysłano').getAttribute('title')).toBe('Brak kredytów SMS');
        expect(screen.getByText('Kampania Wiosenne mycie')).toBeTruthy();
        expect(screen.getByText('87 SMS-ów wysłanych')).toBeTruthy();
        expect(screen.getAllByTestId('sent-sms-row')).toHaveLength(3);

        fireEvent.click(screen.getByRole('button', { name: 'Pokaż starsze' }));
        await waitFor(() => expect(scheduledSmsApi.sent).toHaveBeenLastCalledWith(olderCursor));
    });

    it('kliknięcie w wiersz otwiera zmianę, a zapis wysyła treść i termin jako instant', async () => {
        renderView();
        fireEvent.click(await rowOf('Anna Kowalska'));

        const textarea = await screen.findByLabelText('Treść wiadomości');
        fireEvent.change(textarea, { target: { value: '  Do zobaczenia jutro o 10:00  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

        await waitFor(() => expect(scheduledSmsApi.update).toHaveBeenCalled());
        const [sent, payload] = vi.mocked(scheduledSmsApi.update).mock.calls[0];
        expect(sent).toBe(reminder);
        expect(payload.messageContent).toBe('Do zobaczenia jutro o 10:00');
        expect(payload.scheduledFor).toMatch(/Z$/);
        expect(Math.abs(Date.parse(payload.scheduledFor) - Date.parse(reminder.scheduledFor!))).toBeLessThan(60_000);
    });

    it('błąd zapisu zostaje w oknie, przy formularzu', async () => {
        vi.mocked(scheduledSmsApi.update).mockRejectedValue({
            response: { data: { message: 'Przypomnienie musi wyjść przed wizytą (14.10.2026, 10:00).' } },
        });
        renderView();
        fireEvent.click(await rowOf('Anna Kowalska'));
        fireEvent.click(await screen.findByRole('button', { name: 'Zapisz zmiany' }));

        expect(await screen.findByText('Przypomnienie musi wyjść przed wizytą (14.10.2026, 10:00).')).toBeTruthy();
    });
});
