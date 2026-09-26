// @vitest-environment jsdom
//
// „Edytuj dokument" wołało PUT, którego backend nie miał, i liczyło VAT na sztywno
// po 23% z samego netta. Testy pilnują, że zapis wysyła brutto wpisane przez
// człowieka co do grosza, a dokument faktury KSeF i dokument z wydania pojazdu
// nie dają zmienić kwot.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { EditDocumentModal } from './EditDocumentModal';
import { financeApi } from '../api/financeApi';
import type { FinancialDocument } from '../types';

vi.mock('../api/financeApi', () => ({
    financeApi: { updateDocument: vi.fn() },
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
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <EditDocumentModal document={document} onClose={onClose} />
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

    it('dokument z wydania pojazdu: kwoty zablokowane, reszta do zmiany', () => {
        renderModal(receipt({ source: 'VISIT' }));
        expect(screen.getByText('Dokument z wydania pojazdu')).toBeInTheDocument();
        expect(screen.getByLabelText('Kwota brutto (PLN)')).toBeDisabled();
        expect(screen.getByLabelText('Data wystawienia')).toBeEnabled();
    });

    it('dokument faktury KSeF: zmienia się tylko opis', () => {
        renderModal(receipt({ ksefInvoiceId: 'inv-1' }));
        expect(screen.getByText('Dokument faktury KSeF')).toBeInTheDocument();
        expect(screen.getByLabelText('Kwota netto (PLN)')).toBeDisabled();
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
