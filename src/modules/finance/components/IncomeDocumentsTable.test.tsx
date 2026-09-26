// @vitest-environment jsdom
//
// Zgłoszenie z produkcji: wizytę zakończoną fakturą poprawiono na gotówkę i dokument inny,
// a lista przychodów pokazywała starą fakturę jak żywą — pełna kwota, bez słowa o tym, że
// już nie obowiązuje. Dokument wycofany poprawką rozliczenia musi być nazwany wprost.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { IncomeDocumentsTable } from './IncomeDocumentsTable';
import type { IncomeDocument } from '../types';

const doc = (patch: Partial<IncomeDocument> = {}): IncomeDocument => ({
    id: 'i-1', sourceKind: 'KSEF', documentType: 'INVOICE', documentNumber: 'FV/2026/0003',
    issueDate: '2026-09-26', counterpartyName: 'Jan Kowalski', counterpartyNip: null,
    totalNet: 1_626_016, totalVat: 373_984, totalGross: 2_000_000, currency: 'PLN',
    paymentStatus: 'PAID', paymentLabel: 'Karta', ksefStatus: 'CANCELLED', ksefNumber: null,
    origin: 'CRM', duplicateStatus: 'NONE', visitId: 'v-1', createdAt: '2026-09-26T10:00:00Z',
    excluded: false, note: null, settlementState: null,
    ...patch,
});

const renderTable = (documents: IncomeDocument[]) => {
    const client = new QueryClient();
    render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <IncomeDocumentsTable documents={documents} isLoading={false} onSelect={vi.fn()} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

describe('IncomeDocumentsTable - dokumenty wycofane poprawką rozliczenia', () => {
    afterEach(cleanup);

    it('faktura anulowana w poprawce ma etykietę i przekreśloną kwotę', () => {
        renderTable([doc({ settlementState: 'CANCELLED' })]);
        const row = screen.getByText('FV/2026/0003').closest('tr')!;
        expect(row).toHaveTextContent('Anulowana');
        const amount = screen.getByText(/20\s?000,00/);
        expect(getComputedStyle(amount).textDecoration).toContain('line-through');
    });

    it('faktura wyzerowana korektą i dokument zastąpiony mają swoje etykiety', () => {
        renderTable([
            doc({ id: 'i-1', settlementState: 'ZEROED', ksefStatus: 'ACCEPTED' }),
            doc({ id: 'd-1', sourceKind: 'FINANCE', documentType: 'RECEIPT', documentNumber: 'PAR/2026/0007',
                ksefStatus: null, settlementState: 'SUPERSEDED' }),
        ]);
        expect(screen.getByText('FV/2026/0003').closest('tr')).toHaveTextContent('Skorygowana do zera');
        expect(screen.getByText('PAR/2026/0007').closest('tr')).toHaveTextContent('Zastąpiony');
    });

    it('obowiązujący dokument nie ma etykiety ani przekreślenia', () => {
        renderTable([doc({ ksefStatus: 'ACCEPTED' })]);
        const row = screen.getByText('FV/2026/0003').closest('tr')!;
        expect(row).not.toHaveTextContent('Anulowana');
        expect(getComputedStyle(screen.getByText(/20\s?000,00/)).textDecoration).not.toContain('line-through');
    });
});
