// @vitest-environment jsdom
//
// Faktura z wydania pojazdu poprawiana w Finansach: „Popraw fakturę” i „Wystaw korektę do zera”
// wystawiały korektę w KSeF, ale ceny w wizycie i dokument wizyty zostawały stare - wizyta
// i Finanse pokazywały dwie różne kwoty tej samej sprzedaży. Taka faktura idzie przez
// rozliczenie wizyty; faktura bez wizyty zostaje przy swojej korekcie.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import type { RevenueInvoice } from '../types';
import { RevenueInvoiceDetailModal } from './RevenueInvoiceDetailModal';

const party = { nip: null, name: null, addressLine1: null, addressLine2: null, countryCode: 'PL' };

const invoice = (patch: Partial<RevenueInvoice> = {}): RevenueInvoice => ({
    id: 'inv-1', source: 'CRM', ksefStatus: 'ACCEPTED', invoiceNumber: 'FV/2026/0113',
    ksefNumber: '9685021765-20261008-3C8F626BA0EC-EB', invoiceType: 'VAT', originalInvoiceId: null,
    originalKsefNumber: null, correctionReason: null, issueDate: '2026-10-08', saleDate: '2026-10-08',
    seller: { ...party, name: 'Studio' }, buyer: { ...party, name: 'Jan Kowalski' },
    totalNet: 81_057, totalVat: 18_643, totalGross: 99_700, currency: 'PLN', paymentForm: 'TRANSFER',
    paymentFormLabel: 'Przelew', paymentStatus: 'PAID', paymentDueDate: null, duplicateStatus: 'NONE',
    duplicateOfId: null, hasUpo: false, hasXml: false, sendAttempts: 1, lastSendError: null, sentAt: null,
    acceptedAt: null, visitId: 'v-1', customerId: null, description: null, note: null, excluded: false,
    excludedAt: null, detailsSynced: true, ksefVerificationUrl: null, createdAt: '2026-10-08T10:00:00Z',
    items: [{ lineNumber: 1, name: 'Wosk', unit: 'szt.', quantity: 1, unitPriceNet: 81_057, netValue: 81_057,
        vatValue: 18_643, grossValue: 99_700, vatRate: '23' }],
    ...patch,
});

let current = invoice();
vi.mock('../hooks/useKsefRevenue', () => {
    const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
    return {
        useKsefRevenueInvoiceDetail: () => ({ invoice: current, isLoading: false }),
        useRetryRevenueInvoice: mutation,
        useDeleteRejectedInvoice: mutation,
        useResolveDuplicate: mutation,
        useIssueCorrection: mutation,
        useUpdateRevenuePaymentStatus: mutation,
    };
});
let ksefConfigured = true;
vi.mock('../hooks/useKsef', () => ({
    useKsefAutomation: () => ({ moduleEnabled: true, isLoading: false, configured: ksefConfigured }),
}));
vi.mock('../hooks/usePaymentTracking', () => ({
    usePaymentTracking: () => ({ enabled: true }),
    usePaymentStatusVisible: () => true,
}));
vi.mock('@/modules/visits/components/SettlementCorrectionModal', () => ({
    SettlementCorrectionModal: ({ visitId }: { visitId: string }) => <div>Popraw rozliczenie {visitId}</div>,
}));

const renderModal = () => render(
    <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider theme={theme}>
            <ToastProvider>
                <RevenueInvoiceDetailModal invoiceId="inv-1" onClose={vi.fn()} />
            </ToastProvider>
        </ThemeProvider>
    </QueryClientProvider>,
);

describe('RevenueInvoiceDetailModal - faktura z wydania pojazdu', () => {
    afterEach(() => {
        cleanup();
        current = invoice();
    });

    it('zamiast korekty samej faktury prowadzi do rozliczenia wizyty', async () => {
        renderModal();

        expect(screen.queryByRole('button', { name: 'Popraw fakturę' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Wystaw korektę do zera' })).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: 'Popraw rozliczenie wizyty' }));

        expect(screen.getByText('Popraw rozliczenie v-1')).toBeInTheDocument();
    });

    it('faktura bez wizyty zostaje przy swojej korekcie', () => {
        current = invoice({ visitId: null });
        renderModal();

        expect(screen.getByRole('button', { name: 'Popraw fakturę' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Wystaw korektę do zera' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Popraw rozliczenie wizyty' })).toBeNull();
    });
});

// Audyt 05.11: faktura z okna „Wystaw fakturę (KSeF)” w studiu bez tokenu stała w kolejce
// z komunikatem „KSeF nie działał przy wystawieniu. Wyślemy fakturę sami” - nieprawda,
// bo bez tokenu wysyłka nie przejdzie nigdy.
describe('RevenueInvoiceDetailModal - faktura niewysłana do KSeF', () => {
    afterEach(() => {
        cleanup();
        current = invoice();
        ksefConfigured = true;
    });

    it('w kolejce bez tokenu: mówi o tokenie i nie obiecuje wysyłki', () => {
        ksefConfigured = false;
        current = invoice({ ksefStatus: 'QUEUED_RETRY', ksefNumber: null, visitId: null });
        renderModal();

        expect(screen.getByText(/studio nie ma tokenu KSeF/)).toBeInTheDocument();
        expect(screen.queryByText(/KSeF nie działał przy wystawieniu/)).toBeNull();
        expect(screen.queryByRole('button', { name: /Ponów wysyłkę do KSeF/ })).toBeNull();
    });

    it('w kolejce z tokenem: zostaje obietnica dosłania i ponowienie', () => {
        current = invoice({ ksefStatus: 'QUEUED_RETRY', ksefNumber: null, visitId: null });
        renderModal();

        expect(screen.getByText(/KSeF nie działał przy wystawieniu/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Ponów wysyłkę do KSeF/ })).toBeInTheDocument();
    });

    it('w sesji KSeF (SUBMITTED): ponowienie dociąga status', () => {
        current = invoice({ ksefStatus: 'SUBMITTED', ksefNumber: null, visitId: null });
        renderModal();

        expect(screen.getByRole('button', { name: /Ponów wysyłkę do KSeF/ })).toBeInTheDocument();
    });

    it('wystawiona bez wysyłki, z tokenem: „Wyślij do KSeF”', () => {
        current = invoice({ ksefStatus: 'NOT_SENT', ksefNumber: null, visitId: null });
        renderModal();

        expect(screen.getByText('Tej faktury nie wysłano do KSeF. Wyślij ją albo pobierz XML i wgraj go do KSeF.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Wyślij do KSeF/ })).toBeInTheDocument();
    });

    it('wystawiona bez wysyłki, bez tokenu: najpierw token, przycisk wysyłki znika', () => {
        ksefConfigured = false;
        current = invoice({ ksefStatus: 'NOT_SENT', ksefNumber: null, visitId: null });
        renderModal();

        expect(screen.getByText(/Studio nie ma tokenu KSeF: dodaj go/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Wyślij do KSeF/ })).toBeNull();
    });
});
