// @vitest-environment jsdom
//
// Kolumny tabeli kosztów ułożone jak w tabeli przychodów: data z numerem dokumentu pod
// spodem, osobna kolumna „Typ", potem sprzedawca, notatka, kwota, źródło, płatność, akcje.
// Numer KSeF został w podglądzie faktury.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { KsefExpensesTable } from './KsefExpensesTable';
import type { KsefExpense } from '../types';

const expense = (patch: Partial<KsefExpense> = {}): KsefExpense => ({
    id: 'e-1', source: 'KSEF', ksefNumber: '5260250995-20260926-0123456789AB-01',
    documentNumber: 'FV/123/2026', saleDate: '2026-09-26', sellerName: 'Hurtownia Chemii Sp. z o.o.',
    sellerNip: '5270000000', netAmount: 100, grossAmount: 123, vatAmount: 23, currency: 'PLN',
    paymentMethod: null, paymentMethodLabel: null, paymentStatus: 'PAID', status: 'ACTIVE',
    isCorrection: false, fetchedAt: '2026-09-26T10:00:00Z', note: null, documentKind: 'INVOICE',
    linkedVisit: null,
    ...patch,
});

const renderTable = (expenses: KsefExpense[]) => {
    render(
        <MemoryRouter>
            <QueryClientProvider client={new QueryClient()}>
                <ThemeProvider theme={theme}>
                    <KsefExpensesTable expenses={expenses} />
                </ThemeProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
};

describe('KsefExpensesTable - kolumny', () => {
    afterEach(cleanup);

    it('kolejność kolumn jak w tabeli przychodów', () => {
        renderTable([expense()]);
        const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
        expect(headers).toEqual([
            'Data sprzedaży', 'Typ', 'Sprzedawca', 'Notatka', 'Kwota', 'Źródło', 'Płatność', 'Akcje',
        ]);
    });

    it('numer dokumentu stoi pod datą, a numeru KSeF w wierszu nie ma', () => {
        renderTable([expense()]);
        const cell = screen.getByText('FV/123/2026').closest('td')!;
        expect(cell).toHaveTextContent('26.09.2026');
        expect(screen.queryByText(/0123456789AB/)).toBeNull();
    });

    it('dokument bez numeru mówi to wprost', () => {
        renderTable([expense({ documentNumber: null })]);
        expect(screen.getByText('Brak numeru').closest('td')).toHaveTextContent('26.09.2026');
    });

    it('kolumna „Typ” niesie rodzaj dokumentu i korektę', () => {
        renderTable([expense({ id: 'e-2', documentKind: 'RECEIPT', isCorrection: true })]);
        const typeCell = screen.getAllByRole('row')[1].querySelectorAll('td')[1];
        expect(within(typeCell).getByText('Paragon')).toBeInTheDocument();
        expect(within(typeCell).getByText('Korekta')).toBeInTheDocument();
    });
});
