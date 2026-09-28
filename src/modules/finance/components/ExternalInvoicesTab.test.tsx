// @vitest-environment jsdom
//
// „Do zafakturowania": sprzedaże, do których fakturę wystawia księgowość. Odhacza je
// człowiek (numer opcjonalny) - lista niczego nie łączy sama z fakturą z KSeF.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { ExternalInvoicesTab } from './ExternalInvoicesTab';
import { externalInvoicesApi } from '../api/externalInvoicesApi';
import type { ExternalInvoice } from '../types';

vi.mock('../api/externalInvoicesApi', () => ({
    externalInvoicesApi: {
        list: vi.fn(),
        pendingCount: vi.fn(),
        markIssued: vi.fn(),
        unmarkIssued: vi.fn(),
    },
}));

const sale = (patch: Partial<ExternalInvoice> = {}): ExternalInvoice => ({
    id: 'r-1', kind: 'INVOICE', kindLabel: 'Faktura', status: 'PENDING', statusLabel: 'Do wystawienia',
    visitId: 'v-1', visitNumber: 'W/2026/0042', vehicleLabel: 'Skoda Octavia', licensePlate: 'WX 1234A',
    documentId: 'd-1', documentNumber: 'FAK/2026/0005', paymentMethod: 'TRANSFER', paymentMethodLabel: 'Przelew',
    paymentStatus: 'PENDING', paymentStatusLabel: 'Oczekujący', saleDate: '2026-09-28', dueDate: '2026-10-12',
    buyerNip: '5261040828', buyerName: 'Auto Serwis sp. z o.o.', buyerAddressLine1: 'Polna 1',
    buyerAddressLine2: '00-001 Warszawa', buyerEmail: null, totalNet: 154_472, totalVat: 35_528, totalGross: 190_000,
    externalInvoiceNumber: null, issuedAt: null, issuedByName: null, correctsInvoiceNumber: null,
    createdAt: '2026-09-28T10:00:00Z', ...patch,
});

const renderTab = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <ExternalInvoicesTab />
                    </ToastProvider>
                </ThemeProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    vi.mocked(externalInvoicesApi.list).mockResolvedValue({ items: [sale()], total: 1, page: 1, pageSize: 20 });
    vi.mocked(externalInvoicesApi.pendingCount).mockResolvedValue(1);
    vi.mocked(externalInvoicesApi.markIssued).mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ExternalInvoicesTab', () => {
    it('pokazuje dane do faktury: nabywcę, kwotę brutto co do grosza i wizytę, bez kropek', async () => {
        renderTab();

        expect(await screen.findByText('Auto Serwis sp. z o.o.')).toBeTruthy();
        expect(screen.getByText('NIP 5261040828')).toBeTruthy();
        expect(document.body.textContent).toContain('1900,00');
        expect(screen.getByRole('link', { name: /W\/2026\/0042/ }).getAttribute('href')).toBe('/visits/v-1');
        expect(document.body.textContent).not.toContain('·');
    });

    it('„Faktura wystawiona" z numerem wysyła numer, bez numeru - null', async () => {
        const user = userEvent.setup();
        renderTab();

        await user.click(await screen.findByRole('button', { name: /Faktura wystawiona/ }));
        await user.type(screen.getByLabelText('Numer faktury księgowości (opcjonalnie)'), ' FV 12/09/2026 ');
        await user.click(screen.getByRole('button', { name: /Zapisz/ }));

        await waitFor(() => expect(externalInvoicesApi.markIssued).toHaveBeenCalledWith('r-1', 'FV 12/09/2026'));

        cleanup();
        renderTab();
        await user.click(await screen.findByRole('button', { name: /Faktura wystawiona/ }));
        await user.click(screen.getByRole('button', { name: /Zapisz/ }));
        await waitFor(() => expect(externalInvoicesApi.markIssued).toHaveBeenLastCalledWith('r-1', null));
    });

    it('korekta pokazuje, którą fakturę koryguje, i kwotę ujemną', async () => {
        vi.mocked(externalInvoicesApi.list).mockResolvedValue({
            items: [sale({ kind: 'CORRECTION', kindLabel: 'Korekta faktury', correctsInvoiceNumber: 'FV 12/09/2026',
                totalNet: -154_472, totalVat: -35_528, totalGross: -190_000 })],
            total: 1, page: 1, pageSize: 20,
        });
        renderTab();

        expect(await screen.findByText('Korekta faktury FV 12/09/2026')).toBeTruthy();
        expect(document.body.textContent).toMatch(/-1900,00/);
    });

    it('usunięta wizyta - bez linku, z informacją, że wizyty już nie ma', async () => {
        vi.mocked(externalInvoicesApi.list).mockResolvedValue({
            items: [sale({ visitDeleted: true })], total: 1, page: 1, pageSize: 20,
        });
        renderTab();

        expect(await screen.findByText('Wizyta W/2026/0042 usunięta')).toBeTruthy();
        expect(screen.queryByRole('link', { name: /W\/2026\/0042/ })).toBeNull();
    });
});
