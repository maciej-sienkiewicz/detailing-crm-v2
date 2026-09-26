// @vitest-environment jsdom
//
// Okno „Popraw rozliczenie": podgląd skutków z serwera przed zapisem, blokada, gdy
// serwer mówi, że się nie da, i zapis z wpisanym brutto co do grosza (CLAUDE.md §1).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { SettlementCorrectionModal } from './SettlementCorrectionModal';
import { settlementApi, type SettlementView } from '../api/settlementApi';

vi.mock('../api/settlementApi', () => ({
    settlementApi: { get: vi.fn(), preview: vi.fn(), correct: vi.fn() },
}));

const view: SettlementView = {
    visitId: 'v-1', visitStatus: 'COMPLETED', totalNet: 154_472, totalGross: 190_000,
    documentType: 'RECEIPT', paymentMethod: 'CASH', buyer: null,
    services: [{ id: 's-1', name: 'Przygotowanie do sprzedaży', vatRate: 23, netCents: 154_472, grossCents: 190_000, grossTyped: true }],
    documents: [{
        id: 'd-1', number: 'PAR/2026/0007', type: 'RECEIPT', typeLabel: 'Paragon', paymentMethod: 'CASH',
        paymentMethodLabel: 'Gotówka', totalGross: 190_000, status: 'PAID', issueDate: '2026-09-20',
        active: true, superseded: false, ksefInvoiceId: null,
    }],
    invoices: [], history: [],
};

const renderModal = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <SettlementCorrectionModal visitId="v-1" onClose={onClose} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return onClose;
};

describe('SettlementCorrectionModal', () => {
    beforeEach(() => {
        vi.mocked(settlementApi.get).mockResolvedValue(view);
        vi.mocked(settlementApi.preview).mockResolvedValue({
            steps: ['Kwota wizyty: 1900,00 zł → 1700,00 zł brutto.', 'Zwrot dla klienta: 200,00 zł.'],
            blockReason: null, totalGrossBefore: 190_000, totalGrossAfter: 170_000, customerDifference: -20_000, cashDelta: -20_000,
        });
        vi.mocked(settlementApi.correct).mockResolvedValue({ correctionId: 'c-1', steps: [], ksefError: null });
    });
    afterEach(() => { cleanup(); vi.clearAllMocks(); });

    it('pokazuje skutki z serwera i zapisuje wpisane brutto co do grosza', async () => {
        const onClose = renderModal();
        const gross = await screen.findByLabelText('Brutto: Przygotowanie do sprzedaży');
        fireEvent.change(gross, { target: { value: '1700,00' } });

        expect(await screen.findByText('Zwrot dla klienta: 200,00 zł.')).toBeInTheDocument();
        await waitFor(() => expect(settlementApi.preview).toHaveBeenLastCalledWith('v-1', expect.objectContaining({
            services: [{ serviceLineItemId: 's-1', netCents: 138_211, grossCents: 170_000, vatRate: 23 }],
        })));

        const submit = screen.getByRole('button', { name: 'Zatwierdź poprawkę' });
        await waitFor(() => expect(submit).toBeEnabled());
        fireEvent.click(submit);

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(vi.mocked(settlementApi.correct).mock.calls[0][1].services[0].grossCents).toBe(170_000);
    });

    it('gdy serwer blokuje poprawkę, pokazuje powód i nie pozwala zatwierdzić', async () => {
        vi.mocked(settlementApi.preview).mockResolvedValue({
            steps: [], blockReason: 'Faktura FV/2026/0003 czeka na odpowiedź KSeF.',
            totalGrossBefore: 190_000, totalGrossAfter: 190_000, customerDifference: 0, cashDelta: 0,
        });
        renderModal();
        fireEvent.change(await screen.findByLabelText('Brutto: Przygotowanie do sprzedaży'), { target: { value: '1800,00' } });

        expect(await screen.findByText('Faktura FV/2026/0003 czeka na odpowiedź KSeF.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zatwierdź poprawkę' })).toBeDisabled();
    });

    it('bez zmian nie pyta serwera i nie pozwala zatwierdzić', async () => {
        renderModal();
        expect(await screen.findByText(/Tu zobaczysz, co stanie się z dokumentami/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zatwierdź poprawkę' })).toBeDisabled();
        expect(settlementApi.preview).not.toHaveBeenCalled();
    });

    it('pokazuje obecne dokumenty rozliczenia', async () => {
        renderModal();
        const row = (await screen.findByText('PAR/2026/0007')).closest('li')!;
        expect(row).toHaveTextContent('Paragon');
        expect(row).toHaveTextContent('Gotówka');
        expect(row).toHaveTextContent(/1\s?900,00\s*zł/);
    });
});
