// @vitest-environment jsdom
//
// Wynik wydania: „Auto wydane” jest ostateczne i niezależne od KSeF, a status faktury
// stoi pod nim we własnej karcie. Dawniej „Pojazd wydany” stało nad odrzuconą fakturą.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';

vi.mock('@/modules/finance/hooks', () => ({
    useKsefAutomation: () => ({ isLoading: false, moduleEnabled: true, configured: true }),
}));

import { HandoverResultView } from './HandoverResultView';
import type { CompleteVisitResponse } from '../../types/stateTransitions';

const result = (overrides: Partial<CompleteVisitResponse> = {}): CompleteVisitResponse => ({
    visitId: 'v-1', newStatus: 'COMPLETED', message: '', financialDocumentId: 'd-1', financialDocumentNumber: 'FAK/2026/0005',
    ksefInvoiceId: 'i-1', ksefInvoiceNumber: 'FV/2026/10/123', ksefStatus: 'ACCEPTED', ...overrides,
});

const renderView = (r: CompleteVisitResponse) => render(
    <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider theme={theme}>
            <ToastProvider>
                <HandoverResultView result={r} grossAmount={170_000} currency="PLN" paymentLabel="Karta" thankYouAt={null} onClose={vi.fn()} />
            </ToastProvider>
        </ThemeProvider>
    </QueryClientProvider>,
);

afterEach(cleanup);

describe('HandoverResultView', () => {
    it('przyjęta: auto wydane, płatność zapisana, faktura przyjęta w KSeF i droga do korekty', () => {
        renderView(result());
        expect(screen.getByRole('heading', { name: 'Auto wydane' })).toBeInTheDocument();
        expect(screen.getByText(/Płatność karta 1700,00\szł zapisana\./)).toBeInTheDocument();
        expect(screen.getByText('Faktura FV/2026/10/123 przyjęta w KSeF')).toBeInTheDocument();
        expect(screen.getByText(/Popraw rozliczenie/)).toBeInTheDocument();
        expect(screen.queryByText(/Inne możliwe stany/)).not.toBeInTheDocument();
    });

    it('odrzucona: auto nadal wydane, karta faktury mówi o odrzuceniu i powodzie', () => {
        renderView(result({ ksefStatus: 'REJECTED', ksefError: 'Brak kodu pocztowego nabywcy' }));
        expect(screen.getByRole('heading', { name: 'Auto wydane' })).toBeInTheDocument();
        expect(screen.getByText('KSeF nie przyjął faktury')).toBeInTheDocument();
        expect(screen.getByText('Brak kodu pocztowego nabywcy')).toBeInTheDocument();
        expect(screen.queryByText(/Popraw rozliczenie/)).not.toBeInTheDocument();
    });

    it('faktury wystawia księgowość: bez numeru FAK udającego fakturę', () => {
        renderView(result({ ksefInvoiceId: null, ksefInvoiceNumber: null, ksefStatus: null, invoicedExternally: true }));
        expect(screen.getByText('Fakturę wystawi księgowość')).toBeInTheDocument();
        expect(screen.queryByText(/FAK\/2026/)).not.toBeInTheDocument();
    });
});
