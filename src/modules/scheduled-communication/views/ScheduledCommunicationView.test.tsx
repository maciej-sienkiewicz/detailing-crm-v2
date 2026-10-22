// @vitest-environment jsdom
//
// „Zaplanowana komunikacja": zakładki kanału SMS-y / E-maile, w karcie przełącznik stanu.
// Kampania jako jeden wiersz, anulowanie przez okno potwierdzenia, anulowana wiadomość
// w „Anulowanych" z wznowieniem, a zmiana treści i terminu wysyła do serwera instant -
// tak jak na liście wizyt: menu „⋮" i okna ModalShell.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { scheduledSmsApi } from '../api/scheduledSmsApi';
import { scheduledEmailApi } from '../api/scheduledEmailApi';
import type { ScheduledEmailItem, ScheduledSmsItem, ScheduledSmsOverview, SentEmailItem, SentSmsItem } from '../types';
import { ScheduledCommunicationView } from './ScheduledCommunicationView';

vi.mock('../api/scheduledSmsApi', () => ({
    scheduledSmsApi: { list: vi.fn(), sent: vi.fn(), update: vi.fn(), cancel: vi.fn(), resume: vi.fn() },
}));
vi.mock('../api/scheduledEmailApi', () => ({
    scheduledEmailApi: { list: vi.fn(), sent: vi.fn(), update: vi.fn(), cancel: vi.fn(), resume: vi.fn() },
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

const welcomeMail: ScheduledEmailItem = {
    source: 'QUEUE', id: 'm1', kindLabel: 'E-mail potwierdzenia przyjęcia',
    waitingReason: 'Poza godzinami wysyłki (12:00–18:00), wyjdzie po ich otwarciu', state: 'PENDING',
    scheduledFor: inHours(4), subject: 'Przyjęliśmy Twoje auto', messageContent: 'Dzień dobry, w załączniku protokół.',
    customerId: 'c7', customerName: 'Piotr Lis', emailAddress: 'piotr@example.com', visitId: 'v7', appointmentId: null,
    attachmentNames: ['protokol_przyjecia.pdf'], cancelledAt: null, editable: true, cancellable: true, resumable: false,
    campaign: null,
};
const mailCampaign: ScheduledEmailItem = {
    ...welcomeMail, source: 'CAMPAIGN', id: 'k2', kindLabel: 'Kampania e-mail', waitingReason: 'Wysyłka kampanii trwa',
    subject: 'Jesienna promocja', customerId: null, customerName: null, emailAddress: null, visitId: null,
    attachmentNames: [], editable: false, cancellable: false,
    campaign: { id: 'k2', name: 'Jesień', status: 'SENDING', pendingCount: 3 },
};
const sentMail: SentEmailItem = {
    id: 'e1', sentAt: inHours(-2), status: 'SENT', kindLabel: 'E-mail gotowości do odbioru', subject: 'Auto gotowe do odbioru',
    messageContent: 'Zapraszamy', customerId: 'c8', customerName: 'Ewa Sowa', emailAddress: 'ewa@example.com',
    visitId: 'v8', appointmentId: null, errorMessage: null, campaign: null,
};

const renderView = (path = '/scheduled-communication') => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[path]}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <ScheduledCommunicationView />
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
    vi.mocked(scheduledSmsApi.sent).mockResolvedValue({ items: [sentReminder, sentFailed, sentCampaign], nextCursor: olderCursor });
    vi.mocked(scheduledSmsApi.update).mockResolvedValue();
    vi.mocked(scheduledSmsApi.cancel).mockResolvedValue();
    vi.mocked(scheduledSmsApi.resume).mockResolvedValue();
    vi.mocked(scheduledEmailApi.list).mockResolvedValue({ items: [welcomeMail, mailCampaign], sendWindowOpensAt: '12:00', sendWindowClosesAt: '18:00' });
    vi.mocked(scheduledEmailApi.sent).mockResolvedValue({ items: [sentMail], nextCursor: null });
    vi.mocked(scheduledEmailApi.update).mockResolvedValue();
    vi.mocked(scheduledEmailApi.cancel).mockResolvedValue();
    vi.mocked(scheduledEmailApi.resume).mockResolvedValue();
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const rowOf = async (text: string) => (await screen.findByText(text)).closest('[data-testid="scheduled-row"]') as HTMLElement;

// Menu w portalu czeka niewidoczne na pomiar, którego jsdom nie robi, więc pozycji
// menu szukamy po tekście - dostępna nazwa elementu ukrytego jest pusta.
const menuItem = (name: string) => screen.getByText(name, { selector: '[role="menuitem"]' });

const openMenu = (row: HTMLElement) => fireEvent.click(within(row).getByRole('button', { name: 'Akcje' }));

/** Przełącznik stanu listy w karcie (Segmented) - przyciski, nie zakładki. */
const stateButton = (name: RegExp | string) => screen.getByRole('button', { name });

describe('ScheduledCommunicationView - SMS-y', () => {
    it('kampania jest jednym wierszem z liczbą SMS-ów, bez zmiany i anulowania', async () => {
        renderView();

        const row = await rowOf('Kampania Jesienny przegląd');
        expect(screen.getAllByTestId('scheduled-row')).toHaveLength(2);
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

        fireEvent.click(stateButton(/Anulowane/));
        const row = await rowOf('Jan Nowak');
        expect(screen.queryByText('Anna Kowalska')).toBeNull();
        openMenu(row);
        fireEvent.click(menuItem('Wznów wysyłkę'));

        await waitFor(() => expect(scheduledSmsApi.resume).toHaveBeenCalledWith(cancelled));
    });

    it('zakładki to kanały, a stan listy wybiera przełącznik w karcie - bez chipów filtrów', async () => {
        renderView();
        await rowOf('Anna Kowalska');

        expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(['SMS-y2', 'E-maile2']);
        expect(stateButton(/Zaplanowane/).textContent).toBe('Zaplanowane2');
        expect(stateButton(/Anulowane/).textContent).toBe('Anulowane1');
        expect(screen.queryByRole('button', { name: 'Kampanie' })).toBeNull();

        fireEvent.change(screen.getByLabelText('Szukaj'), { target: { value: 'kowal' } });
        expect(screen.getAllByTestId('scheduled-row')).toHaveLength(1);
    });

    it('zakładka „Wysłane" pokazuje historię z wynikiem i kampanię jednym wierszem', async () => {
        renderView();
        await rowOf('Anna Kowalska');
        expect(scheduledSmsApi.sent).not.toHaveBeenCalled();

        fireEvent.click(stateButton('Wysłane'));

        const failedRow = (await screen.findByText('Kamil Bąk')).closest('[data-testid="sent-row"]') as HTMLElement;
        expect(within(failedRow).getByText('Nie wysłano').getAttribute('title')).toBe('Brak kredytów SMS');
        expect(screen.getByText('Kampania Wiosenne mycie')).toBeTruthy();
        expect(screen.getByText('87 SMS-ów wysłanych')).toBeTruthy();
        expect(screen.getAllByTestId('sent-row')).toHaveLength(3);

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

describe('ScheduledCommunicationView - E-maile', () => {
    it('zakładka e-maili: temat zamiast treści, kampania jednym wierszem z liczbą e-maili', async () => {
        renderView('/scheduled-communication?channel=email');

        const row = await rowOf('Piotr Lis');
        expect(within(row).getByText('Przyjęliśmy Twoje auto')).toBeTruthy();
        expect(within(row).getByText('Przyjęliśmy Twoje auto').getAttribute('title')).toContain('protokol_przyjecia.pdf');
        const campaignRow = await rowOf('Kampania Jesień');
        expect(within(campaignRow).getByText('3 e-maile czekają')).toBeTruthy();
        expect(screen.queryByText('Anna Kowalska')).toBeNull();
        expect(document.body.textContent).not.toMatch(/[·•]/);
    });

    it('przełączenie zakładki kanału pokazuje e-maile i zostawia wybrany stan listy', async () => {
        renderView();
        await rowOf('Anna Kowalska');
        fireEvent.click(stateButton('Wysłane'));
        await screen.findByText('Ola Wrona');

        fireEvent.click(screen.getByRole('tab', { name: /E-maile/ }));

        expect(await screen.findByText('Ewa Sowa')).toBeTruthy();
        expect(screen.getByText('Auto gotowe do odbioru')).toBeTruthy();
        expect(scheduledEmailApi.sent).toHaveBeenCalledWith(null);
    });

    it('zmiana e-maila wysyła temat, treść i termin; okno pokazuje załączniki', async () => {
        renderView('/scheduled-communication?channel=email');
        fireEvent.click(await rowOf('Piotr Lis'));

        expect(await screen.findByText('protokol_przyjecia.pdf')).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Temat'), { target: { value: '  Nowy temat ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

        await waitFor(() => expect(scheduledEmailApi.update).toHaveBeenCalled());
        const [sentItem, payload] = vi.mocked(scheduledEmailApi.update).mock.calls[0];
        expect(sentItem).toBe(welcomeMail);
        expect(payload.subject).toBe('Nowy temat');
        expect(payload.messageContent).toBe('Dzień dobry, w załączniku protokół.');
        expect(payload.scheduledFor).toMatch(/Z$/);
        expect(scheduledSmsApi.update).not.toHaveBeenCalled();
    });

    it('anulowanie e-maila idzie do API e-maili przez okno z właściwym rzeczownikiem', async () => {
        renderView('/scheduled-communication?channel=email');
        openMenu(await rowOf('Piotr Lis'));
        fireEvent.click(menuItem('Anuluj wysyłkę'));

        expect(await screen.findByText('Anuluj wysyłkę e-maila')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Anuluj wysyłkę' }));

        await waitFor(() => expect(scheduledEmailApi.cancel).toHaveBeenCalledWith(welcomeMail));
        expect(scheduledSmsApi.cancel).not.toHaveBeenCalled();
    });
});
