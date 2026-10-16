// @vitest-environment jsdom
//
// Testy KSeF (16.10): w oknie „Wystaw fakturę (KSeF)” cenę dało się wpisać tylko w netto,
// więc 1900,00 zł brutto przy 23% było nieosiągalne (1544,72 → 1900,01, 1544,71 → 1899,99).
// NIP sprawdzano tylko na długość - KSeF przyjął fakturę na NIP z błędną sumą kontrolną.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const api = vi.hoisted(() => ({ issueInvoice: vi.fn() }));
vi.mock('../api/ksefRevenueApi', () => ({ ksefRevenueApi: api }));

import { IssueInvoiceModal } from './IssueInvoiceModal';

const renderModal = () => {
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <ThemeProvider theme={theme}>
                <IssueInvoiceModal isOpen onClose={onClose} />
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
};

const fill = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
    api.issueInvoice.mockReset();
    api.issueInvoice.mockResolvedValue({ id: 'i-1' });
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
});
