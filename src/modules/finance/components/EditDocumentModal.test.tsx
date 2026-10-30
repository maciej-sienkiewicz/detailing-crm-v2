// @vitest-environment jsdom
//
// „Edytuj dokument" wołało PUT, którego backend nie miał, i liczyło VAT na sztywno
// po 23% z samego netta. Testy pilnują, że zapis wysyła brutto wpisane przez
// człowieka co do grosza, a dokument faktury KSeF nie daje zmienić kwot.
//
// Dokument z wydania pojazdu: kwota to ceny usług wizyty. Zmiana idzie poprawką
// rozliczenia (ta sama co „Popraw rozliczenie” w wizycie), nigdy samym PUT dokumentu -
// inaczej wizyta i Finanse pokazywałyby dwie różne kwoty tej samej sprzedaży.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { EditDocumentModal } from './EditDocumentModal';
import { financeApi } from '../api/financeApi';
import type { FinancialDocument } from '../types';
import { settlementApi, type SettlementPreview, type SettlementView } from '@/modules/visits/api/settlementApi';

vi.mock('../api/financeApi', () => ({
    financeApi: { updateDocument: vi.fn() },
}));
vi.mock('@/modules/visits/api/settlementApi', () => ({
    settlementApi: { get: vi.fn(), preview: vi.fn(), correct: vi.fn() },
}));

const receipt = (patch: Partial<FinancialDocument> = {}): FinancialDocument => ({
    id: 'doc-1', documentNumber: 'PAR/2026/0007', source: 'MANUAL', sourceLabel: 'Ręcznie',
    documentType: 'RECEIPT', documentTypeLabel: 'Paragon', direction: 'INCOME', directionLabel: 'Przychód',
    status: 'PAID', statusLabel: 'Opłacony', paymentMethod: 'CASH', paymentMethodLabel: 'Gotówka',
    totalNet: 154_472, totalVat: 35_528, totalGross: 190_000, currency: 'PLN',
    issueDate: '2026-09-20', dueDate: '2026-09-20', paidAt: null, description: 'Mycie',
    counterpartyName: null, counterpartyNip: null, visitId: null, vehicleBrand: null, vehicleModel: null,
    customerFirstName: null, customerLastName: null, createdBy: 'u-1',
    createdAt: '2026-09-20T10:00:00Z', updatedAt: '2026-09-20T10:00:00Z', deletedAt: null,
    ...patch,
});

const renderModal = (document: FinancialDocument, onClose = vi.fn()) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <EditDocumentModal document={document} onClose={onClose} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return onClose;
};

describe('EditDocumentModal', () => {
    beforeEach(() => {
        vi.mocked(financeApi.updateDocument).mockResolvedValue(receipt());
    });
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('zapis bez zmian kwot wysyła brutto 1900,00 zł, a nie 1900,01', async () => {
        const onClose = renderModal(receipt());

        await userEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(financeApi.updateDocument).toHaveBeenCalledWith('doc-1', expect.objectContaining({
            documentType: 'RECEIPT', totalNet: 154_472, totalVat: 35_528, totalGross: 190_000,
        }));
    });

    it('stawka 8% liczy netto od wpisanego brutto', async () => {
        renderModal(receipt());

        await userEvent.click(screen.getByRole('button', { name: '8%' }));
        await userEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

        await waitFor(() => expect(financeApi.updateDocument).toHaveBeenCalled());
        expect(vi.mocked(financeApi.updateDocument).mock.calls[0][1]).toMatchObject({
            totalNet: 175_926, totalGross: 190_000, totalVat: 14_074,
        });
    });

    it('typ dokumentu jest tylko do odczytu', () => {
        renderModal(receipt());
        expect(screen.getByText('Paragon')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Paragon/ })).toBeNull();
    });

    it('dokument z wydania pojazdu bez wizyty: kwoty zablokowane, reszta do zmiany', () => {
        renderModal(receipt({ source: 'VISIT' }));
        expect(screen.getByText('Dokument z wydania pojazdu')).toBeInTheDocument();
        expect(screen.getByLabelText('Kwota brutto (zł)')).toBeDisabled();
        expect(screen.getByLabelText('Data wystawienia')).toBeEnabled();
        expect(settlementApi.get).not.toHaveBeenCalled();
    });

    it('dokument faktury KSeF: zmienia się tylko opis', () => {
        renderModal(receipt({ ksefInvoiceId: 'inv-1' }));
        expect(screen.getByText('Dokument faktury KSeF')).toBeInTheDocument();
        expect(screen.getByLabelText('Kwota netto (zł)')).toBeDisabled();
        expect(screen.getByLabelText('Data wystawienia')).toBeDisabled();
        expect(screen.getByLabelText('Opis / tytuł')).toBeEnabled();
    });

    it('błąd serwera pokazuje jego komunikat', async () => {
        vi.mocked(financeApi.updateDocument).mockRejectedValue({
            isAxiosError: true,
            response: { status: 400, data: { message: 'Kwoty dokumentu wystawionego przy wydaniu pojazdu muszą zgadzać się z kwotą wizyty' } },
        });
        renderModal(receipt());

        await userEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

        expect(await screen.findByText(/muszą zgadzać się z kwotą wizyty/)).toBeInTheDocument();
    });
});

// ─── Dokument z wydania pojazdu ──────────────────────────────────────────────

const settlement = (patch: Partial<SettlementView> = {}): SettlementView => ({
    visitId: 'v-1', visitStatus: 'COMPLETED', totalNet: 154_472, totalGross: 190_000,
    documentType: 'RECEIPT', paymentMethod: 'CASH', buyer: null,
    services: [{ id: 's-1', name: 'Powłoka ceramiczna', vatRate: 23, netCents: 154_472, grossCents: 190_000, grossTyped: true }],
    documents: [{
        id: 'doc-1', number: 'PAR/2026/0007', type: 'RECEIPT', typeLabel: 'Paragon', paymentMethod: 'CASH',
        paymentMethodLabel: 'Gotówka', totalGross: 190_000, status: 'PAID', issueDate: '2026-09-20',
        active: true, superseded: false, ksefInvoiceId: null,
    }],
    invoices: [], history: [], ...patch,
});

const effects = (patch: Partial<SettlementPreview> = {}): SettlementPreview => ({
    steps: ['PAR/2026/0007 zostaje w historii jako zastąpiony, obok korekta storno.', 'Nowy paragon na 2 000,00 zł.'],
    blockReason: null, totalGrossBefore: 190_000, totalGrossAfter: 200_000, customerDifference: 10_000,
    cashDelta: 10_000, ksefAction: 'NONE', ...patch,
});

const visitReceipt = (patch: Partial<FinancialDocument> = {}) =>
    receipt({ source: 'VISIT', sourceLabel: 'Wizyta', visitId: 'v-1', ...patch });

/** Nowa cena usługi w tabeli cen - jak człowiek: zaznacz pole, wpisz kwotę. */
const typeGross = async (value: string) => {
    const input = await screen.findByLabelText('Brutto: Powłoka ceramiczna');
    await userEvent.clear(input);
    await userEvent.type(input, value);
};

describe('EditDocumentModal - kwota dokumentu z wydania pojazdu', () => {
    beforeEach(() => {
        vi.mocked(financeApi.updateDocument).mockResolvedValue(receipt());
        vi.mocked(settlementApi.get).mockResolvedValue(settlement());
        vi.mocked(settlementApi.preview).mockResolvedValue(effects());
        vi.mocked(settlementApi.correct).mockResolvedValue({ correctionId: 'c-1', steps: [], ksefError: null });
    });
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('cena usługi jest do zmiany, a stare pola kwot dokumentu znikają', async () => {
        renderModal(visitReceipt());

        expect(await screen.findByLabelText('Brutto: Powłoka ceramiczna')).toBeEnabled();
        expect(screen.queryByLabelText('Kwota brutto (zł)')).toBeNull();
        expect(screen.getByText(/zmienia ją też w wizycie/)).toBeInTheDocument();
    });

    it('nowa kwota idzie poprawką rozliczenia wizyty, a nie zmianą samego dokumentu', async () => {
        const onClose = renderModal(visitReceipt());

        await typeGross('2000,00');
        expect(await screen.findByText('Co się stanie po zapisie', {}, { timeout: 2000 })).toBeInTheDocument();
        expect(screen.getByText('Klient dopłaca 100,00 zł.')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Zapisz nową kwotę' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(settlementApi.correct).toHaveBeenCalledWith('v-1', expect.objectContaining({
            services: [{ serviceLineItemId: 's-1', netCents: 162_602, grossCents: 200_000, vatRate: 23 }],
            documentType: 'RECEIPT',
            paymentMethod: 'CASH',
            buyer: null,
        }));
        expect(financeApi.updateDocument).not.toHaveBeenCalled();
    });

    it('podgląd i zapis wysyłają to samo: forma płatności wybrana w oknie jedzie w poprawce', async () => {
        renderModal(visitReceipt());
        await typeGross('2000,00');
        await screen.findByText('Co się stanie po zapisie', {}, { timeout: 2000 });

        const previewRequest = vi.mocked(settlementApi.preview).mock.calls.at(-1)![1];
        await userEvent.click(screen.getByRole('button', { name: 'Zapisz nową kwotę' }));
        await waitFor(() => expect(settlementApi.correct).toHaveBeenCalled());
        expect(vi.mocked(settlementApi.correct).mock.calls[0][1]).toEqual(previewRequest);
    });

    it('przy zmianie ceny data, kontrahent i opis są zablokowane i pokazują zapisane wartości', async () => {
        renderModal(visitReceipt());
        await userEvent.clear(await screen.findByLabelText('Opis / tytuł'));
        await userEvent.type(screen.getByLabelText('Opis / tytuł'), 'Zmieniony opis');

        await typeGross('2000,00');

        expect(screen.getByLabelText('Opis / tytuł')).toBeDisabled();
        expect(screen.getByLabelText('Opis / tytuł')).toHaveValue('Mycie');
        expect(screen.getByLabelText('Data wystawienia')).toBeDisabled();
        expect(screen.getByLabelText('Nazwa kontrahenta')).toBeDisabled();
        expect(screen.getByText(/zastępuje ten dokument nowym/)).toBeInTheDocument();
    });

    it('cena przywrócona do wizyty wraca do zwykłego zapisu dokumentu', async () => {
        const onClose = renderModal(visitReceipt());
        await typeGross('2000,00');
        await typeGross('1900,00');
        await userEvent.clear(screen.getByLabelText('Opis / tytuł'));
        await userEvent.type(screen.getByLabelText('Opis / tytuł'), 'Powłoka + mycie');
        await userEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(financeApi.updateDocument).toHaveBeenCalledWith('doc-1', expect.objectContaining({
            description: 'Powłoka + mycie', totalGross: 190_000,
        }));
        expect(settlementApi.correct).not.toHaveBeenCalled();
    });

    it('zmiany, której serwer nie wykona, nie da się zapisać, a okno mówi dlaczego', async () => {
        vi.mocked(settlementApi.preview).mockResolvedValue(effects({
            blockReason: 'Korekta FAK/2026/0001 czeka na KSeF. Spróbuj, gdy KSeF odpowie.',
        }));
        renderModal(visitReceipt());

        await typeGross('2000,00');

        expect(await screen.findByText(/czeka na KSeF/, {}, { timeout: 2000 })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zapisz nową kwotę' })).toBeDisabled();
    });

    it('błąd zapisu poprawki pokazuje komunikat serwera i nie zamyka okna', async () => {
        vi.mocked(settlementApi.correct).mockRejectedValue({
            isAxiosError: true,
            response: { status: 409, data: { message: 'Wizytę zmienił w tym czasie ktoś inny' } },
        });
        const onClose = renderModal(visitReceipt());
        await typeGross('2000,00');
        await screen.findByText('Co się stanie po zapisie', {}, { timeout: 2000 });

        await userEvent.click(screen.getByRole('button', { name: 'Zapisz nową kwotę' }));

        expect(await screen.findByText(/zmienił w tym czasie ktoś inny/)).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('dokument faktury KSeF z wizyty: cena do zmiany, okno uprzedza o korekcie w KSeF', async () => {
        renderModal(visitReceipt({ documentType: 'INVOICE', documentTypeLabel: 'Faktura', ksefInvoiceId: 'inv-1' }));

        expect(await screen.findByLabelText('Brutto: Powłoka ceramiczna')).toBeEnabled();
        expect(screen.getByText(/wystawi korektę faktury/)).toBeInTheDocument();
        expect(screen.getByLabelText('Data wystawienia')).toBeDisabled();
    });

    it('dokument już zastąpiony w rozliczeniu: kwoty bez zmian i powód zamiast tabeli cen', async () => {
        vi.mocked(settlementApi.get).mockResolvedValue(settlement({
            documents: [{ ...settlement().documents[0], active: false, superseded: true }],
        }));
        renderModal(visitReceipt());

        expect(await screen.findByText(/nie obowiązuje już w rozliczeniu wizyty/)).toBeInTheDocument();
        expect(screen.queryByLabelText('Brutto: Powłoka ceramiczna')).toBeNull();
        expect(screen.getByLabelText('Kwota brutto (zł)')).toBeDisabled();
    });

    it('korekta z poprawki rozliczenia nie pyta o rozliczenie wizyty', () => {
        renderModal(visitReceipt({ documentType: 'CORRECTION', totalGross: -190_000 }));
        expect(settlementApi.get).not.toHaveBeenCalled();
    });

    it('bez rozliczenia z serwera zostaje zwykły zapis, a okno mówi, czego brakuje', async () => {
        vi.mocked(settlementApi.get).mockRejectedValue(new Error('network'));
        renderModal(visitReceipt());

        expect(await screen.findByText('Nie udało się wczytać cen usług')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zapisz zmiany' })).toBeEnabled();
    });
});
