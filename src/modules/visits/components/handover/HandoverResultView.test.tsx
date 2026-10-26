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
import { handoverLead } from './handoverLead';
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

describe('handoverLead', () => {
    const fmt = (grosz: number) => `${(grosz / 100).toFixed(2).replace('.', ',')} zł`;
    const base = { visitId: 'v', newStatus: 'completed', message: '', financialDocumentId: null, financialDocumentNumber: null };

    it('podział: faktura i drugi dokument osobno, każdy ze swoją formą zapłaty', () => {
        expect(handoverLead(
            { ...base, totalGross: 1_100_000, invoiceGross: 1_000_000, paymentMethod: 'CARD', remainderGross: 100_000, remainderPaymentMethod: 'CASH', totalGrossBeforeHandover: 1_200_000 },
            1_100_000, 'Karta', fmt
        )).toEqual([
            'Faktura 10000,00 zł brutto, karta.',
            'Inny dokument 1000,00 zł bez VAT, gotówka.',
            'Cena wizyty zmieniona przy wydaniu: 12000,00 zł → 11000,00 zł brutto.',
        ]);
    });

    it('bez podziału: jedno zdanie o płatności', () => {
        expect(handoverLead({ ...base, totalGross: 272_300 }, 272_300, 'Karta', fmt)).toEqual(['Płatność karta 2723,00 zł zapisana.']);
    });

    it('zlecenie zbiorcze: bez słowa o zapisanej płatności, za to dokąd trafiło auto', () => {
        expect(handoverLead(
            { ...base, totalGross: 190_000, batchEntryId: 'e-1', batchContractorName: 'Flota-Trans' },
            190_000, undefined, fmt
        )).toEqual(['Auto za 1900,00 zł trafiło na listę kontrahenta Flota-Trans w zleceniach zbiorczych.']);
    });
});
