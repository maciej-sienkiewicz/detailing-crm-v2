// @vitest-environment jsdom
//
// „Obsługa statusów płatności" wyłączona: studio nie śledzi płatności, więc każdy dokument
// od razu jest przychodem albo kosztem. Statusu, kafla należności, wyboru Opłacona /
// Nieopłacona ani akcji „Oznacz jako opłaconą" nie ma wtedy nigdzie.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { KsefExpensesTable } from './KsefExpensesTable';
import { IncomeDocumentsTable } from './IncomeDocumentsTable';
import { FinanceSummaryCards } from './FinanceSummaryCards';
import { PaymentTrackingPanel } from './PaymentTrackingPanel';
import { financeApi } from '../api/financeApi';
import type { FinanceSummary, IncomeDocument, KsefExpense } from '../types';

vi.mock('../api/financeApi', () => ({
    financeApi: { getSummary: vi.fn(), getFinanceConfig: vi.fn(), updateFinanceConfig: vi.fn() },
}));

const wrap = (node: ReactNode) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <MemoryRouter>
            <QueryClientProvider client={client}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>{node}</ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
};

const expense = (patch: Partial<KsefExpense> = {}): KsefExpense => ({
    id: 'e-1', source: 'KSEF', ksefNumber: null, documentNumber: 'FV/123/2026', saleDate: '2026-09-26',
    sellerName: 'Hurtownia Chemii', sellerNip: null, netAmount: 100, grossAmount: 123, vatAmount: 23,
    currency: 'PLN', paymentMethod: 'PRZELEW', paymentMethodLabel: 'Przelew', paymentStatus: 'PENDING',
    status: 'ACTIVE', isCorrection: false, fetchedAt: '2026-09-26T10:00:00Z', note: null,
    documentKind: 'INVOICE', linkedVisit: null,
    ...patch,
});

const income = (patch: Partial<IncomeDocument> = {}): IncomeDocument => ({
    id: 'i-1', sourceKind: 'FINANCE', documentType: 'RECEIPT', documentNumber: 'PAR/2026/0003',
    issueDate: '2026-09-26', counterpartyName: 'Jan Kowalski', counterpartyNip: null,
    totalNet: 154_472, totalVat: 35_528, totalGross: 190_000, currency: 'PLN',
    paymentStatus: 'PENDING', paymentLabel: 'Przelew', ksefStatus: null, ksefNumber: null,
    origin: 'CRM', duplicateStatus: 'NONE', visitId: null, createdAt: '2026-09-26T10:00:00Z',
    excluded: false, note: null, settlementState: null,
    ...patch,
});

const summary = (patch: Partial<FinanceSummary> = {}): FinanceSummary => ({
    dateFrom: null, dateTo: null, totalRevenue: 290_000, totalCosts: 100_000, profit: 190_000,
    pendingReceivables: 0, pendingPayables: 0, pendingReceivablesGross: 0, pendingPayablesGross: 0,
    overdueReceivables: 0, overduePayables: 0,
    ...patch,
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('Bez obsługi statusów płatności', () => {
    it('tabela kosztów pokazuje samą formę płatności, bez statusu i bez „Oznacz jako opłaconą”', () => {
        wrap(<KsefExpensesTable expenses={[expense()]} showPaymentStatus={false} />);

        expect(screen.queryByText('Nieopłacona')).toBeNull();
        expect(screen.queryByTitle('Oznacz jako opłaconą')).toBeNull();
        expect(screen.getByText('Przelew')).toBeInTheDocument();
    });

    it('z obsługą statusów tabela kosztów dalej pozwala oznaczyć fakturę jako opłaconą', () => {
        wrap(<KsefExpensesTable expenses={[expense()]} />);

        expect(screen.getByText('Nieopłacona')).toBeInTheDocument();
        expect(screen.getByTitle('Oznacz jako opłaconą')).toBeInTheDocument();
    });

    it('lista przychodów nie pokazuje statusu płatności, tylko formę', () => {
        wrap(<IncomeDocumentsTable documents={[income()]} isLoading={false} onSelect={vi.fn()} showPaymentStatus={false} />);

        expect(screen.queryByText('Nieopłacony')).toBeNull();
        expect(screen.getByText('Przelew')).toBeInTheDocument();
    });

    it('kafle: bez należności, przychód i koszty opisane jako wszystkie dokumenty', async () => {
        vi.mocked(financeApi.getFinanceConfig).mockResolvedValue({ paymentTrackingEnabled: false });
        vi.mocked(financeApi.getSummary).mockResolvedValue(summary({ paymentTrackingEnabled: false }));
        wrap(<FinanceSummaryCards />);

        expect(await screen.findByText('netto, wszystkie faktury / paragony')).toBeInTheDocument();
        expect(screen.getByText('netto, wszystkie faktury kosztowe')).toBeInTheDocument();
        expect(screen.queryByText('Należności')).toBeNull();
    });

    it('kafle z obsługą statusów: należności zostają', async () => {
        vi.mocked(financeApi.getFinanceConfig).mockResolvedValue({ paymentTrackingEnabled: true });
        vi.mocked(financeApi.getSummary).mockResolvedValue(summary({ paymentTrackingEnabled: true, pendingReceivables: 50_000 }));
        wrap(<FinanceSummaryCards />);

        expect(await screen.findByText('netto, opłacone faktury / paragony')).toBeInTheDocument();
        expect(screen.getByText('Należności')).toBeInTheDocument();
    });
});

describe('PaymentTrackingPanel', () => {
    it('przełącznika nie ma, dopóki stan jest nieznany', () => {
        vi.mocked(financeApi.getFinanceConfig).mockReturnValue(new Promise(() => {}));
        wrap(<PaymentTrackingPanel />);

        expect(screen.queryByRole('switch', { name: 'Obsługa statusów płatności' })).toBeNull();
    });

    it('wyłączenie zapisuje ustawienie i mówi, że każdy dokument liczy się od razu', async () => {
        vi.mocked(financeApi.getFinanceConfig).mockResolvedValue({ paymentTrackingEnabled: true });
        vi.mocked(financeApi.updateFinanceConfig).mockResolvedValue({ paymentTrackingEnabled: false });
        const user = userEvent.setup();
        wrap(<PaymentTrackingPanel />);

        const toggle = await screen.findByRole('switch', { name: 'Obsługa statusów płatności' });
        expect((toggle as HTMLInputElement).checked).toBe(true);
        await user.click(toggle);

        await waitFor(() =>
            expect(financeApi.updateFinanceConfig).toHaveBeenCalledWith({ paymentTrackingEnabled: false }),
        );
        expect(await screen.findByText(/Każdy dokument od razu liczy się do przychodu albo kosztu/)).toBeInTheDocument();
    });
});
