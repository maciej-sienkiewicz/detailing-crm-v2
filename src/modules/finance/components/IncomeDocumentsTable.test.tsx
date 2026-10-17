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

    it('reszta wizyty bez paragonu ma własną plakietkę zamiast „Inny”', () => {
        renderTable([
            doc({ id: 'd-2', sourceKind: 'FINANCE', documentType: 'OTHER', documentNumber: 'DOK/2026/0003',
                ksefStatus: null, totalNet: 700_000, totalVat: 0, totalGross: 700_000, withoutReceipt: true }),
            doc({ id: 'd-3', sourceKind: 'FINANCE', documentType: 'OTHER', documentNumber: 'DOK/2026/0004',
                ksefStatus: null }),
        ]);
        expect(screen.getByText('DOK/2026/0003').closest('tr')).toHaveTextContent('Bez paragonu');
        expect(screen.getByText('DOK/2026/0004').closest('tr')).toHaveTextContent('Inny');
        expect(screen.getByText('DOK/2026/0004').closest('tr')).not.toHaveTextContent('Bez paragonu');
    });

    it('obowiązujący dokument nie ma etykiety ani przekreślenia', () => {
        renderTable([doc({ ksefStatus: 'ACCEPTED' })]);
        const row = screen.getByText('FV/2026/0003').closest('tr')!;
        expect(row).not.toHaveTextContent('Anulowana');
        expect(getComputedStyle(screen.getByText(/20\s?000,00/)).textDecoration).not.toContain('line-through');
    });
});

// Kolumny uproszczone na życzenie biznesu: numer dokumentu stoi pod datą, osobnej kolumny
// „Numer" nie ma, a numer KSeF został w szczegółach dokumentu.
describe('IncomeDocumentsTable - numer pod datą', () => {
    afterEach(cleanup);

    it('numer dokumentu jest w komórce daty, bez numeru KSeF i bez kolumny „Numer”', () => {
        const ksefNumber = '5260250995-20260926-0123456789AB-01';
        renderTable([doc({ ksefStatus: 'ACCEPTED', ksefNumber })]);

        const cell = screen.getByText('FV/2026/0003').closest('td')!;
        expect(cell).toHaveTextContent('26.09.2026');
        expect(screen.queryByText(ksefNumber)).toBeNull();
        expect(screen.queryByRole('columnheader', { name: 'Numer' })).toBeNull();
    });

    it('długa nazwa nabywcy ma pełne brzmienie w tooltipie', () => {
        const name = 'Przedsiębiorstwo Handlowo-Usługowe Auto-Detailing Jan Kowalski i Wspólnicy sp.k.';
        renderTable([doc({ counterpartyName: name, counterpartyNip: '5270000000' })]);
        expect(screen.getByText(name)).toHaveAttribute('title', name);
    });
});
