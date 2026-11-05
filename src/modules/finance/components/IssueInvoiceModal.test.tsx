// @vitest-environment jsdom
//
// Testy KSeF (16.10): w oknie „Wystaw fakturę (KSeF)” cenę dało się wpisać tylko w netto,
// więc 1900,00 zł brutto przy 23% było nieosiągalne (1544,72 → 1900,01, 1544,71 → 1899,99).
// NIP sprawdzano tylko na długość - KSeF przyjął fakturę na NIP z błędną sumą kontrolną.
//
// Audyt 05.11: okno wysyłało do KSeF zawsze, niezależnie od ustawień „Finanse i KSeF”.
// W studiu bez tokenu faktura szła do kolejki ponowień z komunikatem „KSeF nie działał”.
// Wysyłka jest teraz wyborem przy każdej fakturze, a bez tokenu wyboru nie ma.
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import type { RevenueInvoice } from '../types';

const api = vi.hoisted(() => ({ issueInvoice: vi.fn() }));
vi.mock('../api/ksefRevenueApi', () => ({ ksefRevenueApi: api }));

/** Stan z GET /ksef/invoicing-status, przestawiany per test. */
const ksef = vi.hoisted(() => ({
    state: {} as Record<string, unknown>,
}));
vi.mock('../hooks/useKsef', () => ({ useKsefAutomation: () => ksef.state }));

import { IssueInvoiceModal } from './IssueInvoiceModal';
import { issueResultToast } from '../utils/issueResultToast';

const ksefReady = (overrides: Record<string, unknown> = {}) => ({
    moduleEnabled: true, configured: true, lacksIssuePermission: false,
    autoSendDefault: true, invoicesIssuedExternally: false, isLoading: false, ...overrides,
});

const renderModal = () => {
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <IssueInvoiceModal isOpen onClose={onClose} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
};

const fillConsumer = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Konsument' }));
    fireEvent.change(screen.getByPlaceholderText('np. Jan Kowalski'), { target: { value: 'Jan Konsument' } });
    fill('Nazwa pozycji 1', 'Powłoka ceramiczna');
    fill('Cena brutto pozycji 1', '1900,00');
};

const fillCompany = () => {
    fireEvent.change(screen.getByPlaceholderText('np. 5213017228'), { target: { value: '5213017228' } });
    fill('Nazwa pozycji 1', 'Korekta lakieru');
    fill('Cena netto pozycji 1', '1000,00');
};

const lastPayload = () => api.issueInvoice.mock.calls[api.issueInvoice.mock.calls.length - 1][0];

const invoice = (overrides: Partial<RevenueInvoice> = {}) =>
    ({ id: 'i-1', invoiceNumber: 'FV/2026/0007', ksefStatus: 'ACCEPTED', lastSendError: null, ...overrides }) as RevenueInvoice;

const fill = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
    api.issueInvoice.mockReset();
    api.issueInvoice.mockResolvedValue(invoice());
    ksef.state = ksefReady();
});
afterEach(cleanup);

describe('IssueInvoiceModal', () => {
    it('konsument: cena wpisana w brutto idzie jako brutto - 1900,00 zł zostaje 1900,00', async () => {
        const { onClose } = renderModal();
        fireEvent.click(screen.getByRole('button', { name: 'Konsument' }));
        fireEvent.change(screen.getByPlaceholderText('np. Jan Kowalski'), { target: { value: 'Jan Konsument' } });
        fill('Nazwa pozycji 1', 'Powłoka ceramiczna');
        fill('Cena brutto pozycji 1', '1900,00');

        expect(screen.getByText('1900,00 zł', { exact: false })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw i wyślij do KSeF' }));

        await waitFor(() => expect(api.issueInvoice).toHaveBeenCalledTimes(1));
        const payload = api.issueInvoice.mock.calls[0][0];
        expect(payload.items[0]).toMatchObject({ unitPriceGross: 190_000, vatRate: '23', unit: 'szt.' });
        expect(payload.items[0].unitPriceNet).toBeUndefined();
        expect(payload.issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('firma: domyślnie netto, a jednostkę miary da się zmienić', async () => {
        renderModal();
        fireEvent.change(screen.getByPlaceholderText('np. 5213017228'), { target: { value: '5213017228' } });
        fill('Nazwa pozycji 1', 'Mikrofibra');
        fill('Ilość pozycji 1', '2,5');
        fill('Jednostka pozycji 1', 'm');
        fill('Cena netto pozycji 1', '12,35');
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw i wyślij do KSeF' }));

        await waitFor(() => expect(api.issueInvoice).toHaveBeenCalledTimes(1));
        expect(api.issueInvoice.mock.calls[0][0].items[0]).toMatchObject({
            unitPriceNet: 1_235, quantity: 2.5, unit: 'm',
        });
    });

    it('NIP z błędną sumą kontrolną nie przechodzi', async () => {
        renderModal();
        fireEvent.change(screen.getByPlaceholderText('np. 5213017228'), { target: { value: '3669982427' } });
        fill('Nazwa pozycji 1', 'Mycie');
        fill('Cena netto pozycji 1', '40,65');
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw i wyślij do KSeF' }));

        expect(await screen.findByText(/błędną sumę kontrolną/)).toBeInTheDocument();
        expect(api.issueInvoice).not.toHaveBeenCalled();
    });

    it('domyślnie wysyła: payload niesie sendToKsef = true, a dymek mówi o przyjęciu w KSeF', async () => {
        renderModal();
        fillConsumer();
        expect(screen.getByText('Faktura trafi do KSeF zaraz po wystawieniu')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw i wyślij do KSeF' }));

        await waitFor(() => expect(api.issueInvoice).toHaveBeenCalledTimes(1));
        expect(lastPayload().sendToKsef).toBe(true);
        expect(await screen.findByText('Faktura FV/2026/0007 przyjęta w KSeF')).toBeInTheDocument();
    });
});

describe('IssueInvoiceModal: wysyłka do KSeF według ustawień', () => {
    it('„Domyślnie wysyłaj” wyłączone: konsument domyślnie bez wysyłki', async () => {
        ksef.state = ksefReady({ autoSendDefault: false });
        api.issueInvoice.mockResolvedValue(invoice({ ksefStatus: 'NOT_SENT' }));
        renderModal();
        fillConsumer();

        expect(screen.getByRole('button', { name: 'Bez wysyłki' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Faktura powstanie bez wysyłki do KSeF')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw bez wysyłki' }));

        await waitFor(() => expect(api.issueInvoice).toHaveBeenCalledTimes(1));
        expect(lastPayload().sendToKsef).toBe(false);
        expect(await screen.findByText('Faktura FV/2026/0007 wystawiona')).toBeInTheDocument();
    });

    it('„Domyślnie wysyłaj” wyłączone: faktura na firmę i tak domyślnie idzie do KSeF', async () => {
        ksef.state = ksefReady({ autoSendDefault: false });
        renderModal();
        fillCompany();

        expect(screen.getByRole('button', { name: 'Wyślij do KSeF' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw i wyślij do KSeF' }));

        await waitFor(() => expect(api.issueInvoice).toHaveBeenCalledTimes(1));
        expect(lastPayload().sendToKsef).toBe(true);
    });

    it('firma bez wysyłki: wolno, z ostrzeżeniem o obowiązku', async () => {
        api.issueInvoice.mockResolvedValue(invoice({ ksefStatus: 'NOT_SENT' }));
        renderModal();
        fillCompany();
        expect(screen.queryByText(/Fakturę na firmę trzeba wysłać do KSeF/)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Bez wysyłki' }));
        expect(screen.getByText(/Fakturę na firmę trzeba wysłać do KSeF/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw bez wysyłki' }));

        await waitFor(() => expect(api.issueInvoice).toHaveBeenCalledTimes(1));
        expect(lastPayload().sendToKsef).toBe(false);
    });

    it('wybór użytkownika wygrywa z ustawieniem: konsument z wysyłką mimo „Domyślnie” wyłączonego', async () => {
        ksef.state = ksefReady({ autoSendDefault: false });
        renderModal();
        fillConsumer();
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij do KSeF' }));
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw i wyślij do KSeF' }));

        await waitFor(() => expect(api.issueInvoice).toHaveBeenCalledTimes(1));
        expect(lastPayload().sendToKsef).toBe(true);
    });

    it('wybór nie przechodzi na następną fakturę: zamknięcie okna wraca do ustawienia', () => {
        // Okno w Finansach zostaje zamontowane między otwarciami - stan musi wyzerować reset().
        const Harness = () => {
            const [open, setOpen] = useState(true);
            return (
                <>
                    {!open && <button onClick={() => setOpen(true)}>Otwórz ponownie</button>}
                    <IssueInvoiceModal isOpen={open} onClose={() => setOpen(false)} />
                </>
            );
        };
        render(
            <QueryClientProvider client={new QueryClient()}>
                <ThemeProvider theme={theme}>
                    <ToastProvider><Harness /></ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Bez wysyłki' }));
        fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
        fireEvent.click(screen.getByRole('button', { name: 'Otwórz ponownie' }));

        expect(screen.getByRole('button', { name: 'Wyślij do KSeF' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('brak tokenu: bez wyboru, faktura wystawiona bez wysyłki i powód w oknie', async () => {
        ksef.state = ksefReady({ configured: false });
        api.issueInvoice.mockResolvedValue(invoice({ ksefStatus: 'NOT_SENT' }));
        renderModal();
        fillCompany();

        expect(screen.getByText(/Studio nie ma tokenu KSeF/)).toBeInTheDocument();
        expect(screen.queryByRole('group', { name: 'Wysyłka do KSeF' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Wystaw i wyślij do KSeF' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw bez wysyłki' }));

        await waitFor(() => expect(api.issueInvoice).toHaveBeenCalledTimes(1));
        expect(lastPayload().sendToKsef).toBe(false);
    });

    it('token bez prawa wystawiania: tak samo bez wysyłki, z innym powodem', async () => {
        ksef.state = ksefReady({ lacksIssuePermission: true });
        renderModal();
        fillConsumer();

        expect(screen.getByText(/Token KSeF nie ma prawa wystawiania faktur/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw bez wysyłki' }));

        await waitFor(() => expect(api.issueInvoice).toHaveBeenCalledTimes(1));
        expect(lastPayload().sendToKsef).toBe(false);
    });

    it('„Faktury wystawia księgowość”: okno działa normalnie, wysyłka zostaje wyborem', async () => {
        ksef.state = ksefReady({ invoicesIssuedExternally: true });
        renderModal();
        fillConsumer();
        expect(screen.getByRole('group', { name: 'Wysyłka do KSeF' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Bez wysyłki' }));
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw bez wysyłki' }));

        await waitFor(() => expect(api.issueInvoice).toHaveBeenCalledTimes(1));
        expect(lastPayload().sendToKsef).toBe(false);
    });

    it('nieznane ustawienie (starszy serwer bez pola): konsument domyślnie z wysyłką, jak dawniej', () => {
        ksef.state = ksefReady({ autoSendDefault: undefined });
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: 'Konsument' }));
        expect(screen.getByRole('button', { name: 'Wyślij do KSeF' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('w trakcie wczytywania ustawień nie straszy brakiem tokenu', () => {
        ksef.state = { moduleEnabled: true, configured: false, isLoading: true };
        renderModal();
        expect(screen.queryByText(/Studio nie ma tokenu KSeF/)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Wystaw i wyślij do KSeF' })).toBeInTheDocument();
    });

    it('odrzucenie przez KSeF nie znika po cichu: dymek z powodem', async () => {
        api.issueInvoice.mockResolvedValue(invoice({ ksefStatus: 'REJECTED', lastSendError: 'Brak kodu pocztowego nabywcy' }));
        renderModal();
        fillConsumer();
        fireEvent.click(screen.getByRole('button', { name: 'Wystaw i wyślij do KSeF' }));

        expect(await screen.findByText('KSeF nie przyjął faktury FV/2026/0007')).toBeInTheDocument();
        expect(screen.getByText('Brak kodu pocztowego nabywcy')).toBeInTheDocument();
    });
});

describe('issueResultToast', () => {
    it('każdy stan KSeF ma swój dymek', () => {
        expect(issueResultToast(invoice(), true)).toMatchObject({ tone: 'success', title: 'Faktura FV/2026/0007 przyjęta w KSeF' });
        expect(issueResultToast(invoice({ ksefStatus: 'SUBMITTED' }), true)).toMatchObject({ tone: 'info', title: 'Faktura FV/2026/0007 wysłana do KSeF' });
        expect(issueResultToast(invoice({ ksefStatus: 'QUEUED_RETRY' }), true)).toMatchObject({ tone: 'warning' });
        expect(issueResultToast(invoice({ ksefStatus: 'REJECTED' }), true)).toMatchObject({ tone: 'error', message: 'Popraw dane i wystaw ją ponownie.' });
        expect(issueResultToast(invoice({ ksefStatus: 'NOT_SENT' }), false)).toMatchObject({ tone: 'success', title: 'Faktura FV/2026/0007 wystawiona' });
    });

    it('wysyłkę wybrano, a serwer jej nie zrobił: ostrzeżenie o braku tokenu, nie „wystawiona”', () => {
        const toast = issueResultToast(invoice({ ksefStatus: 'NOT_SENT' }), true);
        expect(toast.tone).toBe('warning');
        expect(toast.title).toBe('Faktura FV/2026/0007 wystawiona bez wysyłki do KSeF');
        expect(toast.message).toMatch(/Studio nie ma tokenu KSeF/);
    });
});
