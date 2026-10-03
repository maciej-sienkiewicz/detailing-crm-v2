// @vitest-environment jsdom
//
// Zgłoszenie biznesu z 03.10: w „Dokumentach kosztowych" dało się dodać ręcznie tylko
// fakturę. Teraz także paragon, rachunek i inny koszt - każdy z polem „Czego dotyczy",
// pod którym trafia do „Pozycji kosztowych". Kwoty idą w groszach ze stroną wpisaną
// przez człowieka: wpisane brutto 1900.00 zostaje 1900.00 (CLAUDE.md §1).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const api = vi.hoisted(() => ({ createExpense: vi.fn() }));
vi.mock('../api/ksefApi', () => ({ ksefApi: api }));

import { AddExpenseModal } from './AddExpenseModal';

const renderModal = () => {
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <ThemeProvider theme={theme}>
                <AddExpenseModal isOpen onClose={onClose} />
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
};

const type = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });

beforeEach(() => {
    api.createExpense.mockReset();
    api.createExpense.mockResolvedValue({ id: 'e-1' });
});
afterEach(cleanup);

describe('AddExpenseModal - dokument kosztowy dowolnego rodzaju', () => {
    it('paragon z opisem i kwotą brutto idzie w groszach jako RECEIPT ze stroną GROSS', async () => {
        const { onClose } = renderModal();
        expect(screen.getByRole('dialog', { name: /Dodaj dokument kosztowy/ })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Paragon' }));
        type('Czego dotyczy', 'Paliwo');
        type('Kwota brutto', '1900.00');
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz dokument' }));

        await waitFor(() => expect(api.createExpense).toHaveBeenCalledTimes(1));
        const payload = api.createExpense.mock.calls[0][0];
        expect(payload).toMatchObject({
            documentKind: 'RECEIPT',
            description: 'Paliwo',
            grossCents: 190000,
            netCents: 154472,
            vatRate: '23',
            priceSide: 'GROSS',
        });
        expect(typeof payload.saleDate).toBe('string');
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('dokument inny niż faktura bez opisu nie wychodzi do serwera', () => {
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: 'Inny dokument' }));
        type('Kwota brutto', '50.00');
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz dokument' }));

        expect(screen.getByText('Napisz, czego dotyczy koszt.')).toBeInTheDocument();
        expect(api.createExpense).not.toHaveBeenCalled();
    });

    it('faktura wymaga numeru i kwoty', () => {
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz dokument' }));

        expect(screen.getByText('Podaj numer faktury.')).toBeInTheDocument();
        expect(screen.getByText('Podaj kwotę netto albo brutto.')).toBeInTheDocument();
        expect(api.createExpense).not.toHaveBeenCalled();
    });

    it('komunikat serwera trafia do okna', async () => {
        api.createExpense.mockRejectedValueOnce({ response: { data: { message: 'Podaj datę dokumentu' } } });
        renderModal();
        type('Numer faktury', 'FV/1/2026');
        type('Kwota netto', '100');
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz dokument' }));

        expect(await screen.findByText('Podaj datę dokumentu')).toBeInTheDocument();
    });
});
