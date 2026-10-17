// @vitest-environment jsdom
//
// Sekcja „Koszty i zysk" na karcie wizyty: zysk jako nagłówek sekcji, dokument, który się
// nie liczy, z powodem, odpięcie jednym kliknięciem i przeniesienie kosztu z innej wizyty
// dopiero po wyraźnej zgodzie - jeden koszt należy do jednej wizyty.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { formatMoney } from '@/modules/finance/utils/formatters';
import { VisitCostsSection } from './VisitCostsSection';
import {
    visitCostsApi,
    type CostDocument,
    type CostDocumentCandidates,
    type VisitCosts,
} from '../api/visitCostsApi';

vi.mock('../api/visitCostsApi', () => ({
    visitCostsApi: { get: vi.fn(), candidates: vi.fn(), link: vi.fn(), unlink: vi.fn() },
}));

const doc = (over: Partial<CostDocument> = {}): CostDocument => ({
    id: 'c-1', source: 'KSEF', documentKind: 'INVOICE', documentNumber: 'FV/10/2026', ksefNumber: 'K-1',
    saleDate: '2026-10-01T10:00:00Z', sellerName: 'Folie PPF Sp. z o.o.', sellerNip: '5223003098',
    netAmount: 50_000, grossAmount: 61_500, currency: 'PLN', status: 'ACTIVE', isCorrection: false,
    paymentStatus: 'PAID', counted: true, exclusion: null,
    ...over,
});

// Cena wizyty wpisana jako 1900,00 zł brutto (154 472 gr netto) i faktura za folię.
const costs = (over: Partial<VisitCosts> = {}): VisitCosts => ({
    visitId: 'v-1', visitStatus: 'COMPLETED', revenueBasis: 'SETTLED',
    revenueNet: 154_472, revenueGross: 190_000, costNet: 50_000, costGross: 61_500,
    profitNet: 104_472, marginPercent: 67.6, countedDocuments: 1,
    documents: [{ document: doc(), linkedAt: '2026-10-02T10:00:00Z', linkedByName: 'Anna' }],
    ...over,
});

/** Kwota tak, jak czyta ją testing-library: twarda spacja z Intl zamieniona na zwykłą. */
const money = (cents: number) => formatMoney(cents).replace(/\s/g, ' ');

const renderSection = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <VisitCostsSection visitId="v-1" />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

describe('VisitCostsSection', () => {
    beforeEach(() => {
        vi.mocked(visitCostsApi.get).mockResolvedValue(costs());
    });
    afterEach(() => { cleanup(); vi.clearAllMocks(); });

    it('zysk netto jest nagłówkiem sekcji, a pod nim zdanie: przychód, koszty, marża', async () => {
        renderSection();

        expect(await screen.findByText(money(104_472))).toBeInTheDocument();
        expect(screen.getByText('Zysk netto')).toBeInTheDocument();
        expect(screen.getByText(
            `Przychód netto ${money(154_472)}, koszty netto ${money(50_000)}, marża 67,6%`,
        )).toBeInTheDocument();
        expect(screen.getByText('Folie PPF Sp. z o.o.')).toBeInTheDocument();
        expect(screen.getByText('Faktura FV/10/2026')).toBeInTheDocument();
    });

    it('sekcja nie ma wypełnionego przycisku - krok następny jest w nagłówku wizyty', async () => {
        renderSection();
        await screen.findByText(money(104_472));

        const fills = document.querySelectorAll('[data-variant="primary"], [data-variant="success"]');
        expect(fills).toHaveLength(0);
        expect(screen.getByRole('button', { name: /Przypnij koszt/ })).toHaveAttribute('data-variant', 'tinted');
    });

    it('dokument ukryty w finansach zostaje na liście z powodem, a strata nosi czerwień znaczenia', async () => {
        vi.mocked(visitCostsApi.get).mockResolvedValue(costs({
            revenueNet: 10_000, profitNet: -40_000, marginPercent: -400,
            documents: [
                { document: doc(), linkedAt: '2026-10-02T10:00:00Z', linkedByName: null },
                {
                    document: doc({ id: 'c-2', documentNumber: 'FV/11/2026', status: 'EXCLUDED', counted: false, exclusion: 'HIDDEN' }),
                    linkedAt: '2026-10-03T10:00:00Z', linkedByName: null,
                },
            ],
        }));
        renderSection();

        expect(await screen.findByText('Ukryty w finansach, nie liczy się')).toBeInTheDocument();
        expect(screen.getByText(money(-40_000))).toBeInTheDocument();
    });

    it('odpięcie wysyła dokument do serwera i pokazuje rachunek z odpowiedzi', async () => {
        vi.mocked(visitCostsApi.unlink).mockResolvedValue(costs({
            documents: [], costNet: 0, costGross: 0, profitNet: 154_472, marginPercent: 100, countedDocuments: 0,
        }));
        renderSection();

        fireEvent.click(await screen.findByRole('button', { name: 'Odepnij od wizyty: Faktura FV/10/2026' }));

        await waitFor(() => expect(visitCostsApi.unlink).toHaveBeenCalledWith('v-1', 'c-1'));
        expect(await screen.findByText(`Przychód netto ${money(154_472)}, bez przypiętych kosztów`)).toBeInTheDocument();
    });

    it('koszt innej wizyty przenosi się dopiero po potwierdzeniu', async () => {
        const candidates: CostDocumentCandidates = {
            total: 2, periodFrom: '2026-09-01', periodTo: '2026-11-15',
            candidates: [
                {
                    document: doc({ id: 'c-9', documentNumber: 'FV/99/2026', sellerName: 'Lakiernia Nowak' }),
                    linkedVisit: { visitId: 'v-2', visitNumber: '2026/0042', label: 'Audi A6 (WX 1234)', deleted: false, current: false },
                },
                {
                    document: doc({ id: 'c-10', documentNumber: 'FV/100/2026', sellerName: 'Hurtownia Chemii' }),
                    linkedVisit: null,
                },
            ],
        };
        vi.mocked(visitCostsApi.candidates).mockResolvedValue(candidates);
        vi.mocked(visitCostsApi.link).mockResolvedValue(costs());
        renderSection();
        await screen.findByText(money(104_472));

        fireEvent.click(screen.getByRole('button', { name: /Przypnij koszt/ }));
        const dialog = await screen.findByRole('dialog', { name: 'Przypnij koszt do wizyty' });

        // Jedno wypełnienie w otwartym oknie: „Gotowe".
        expect(dialog.querySelectorAll('[data-variant="primary"], [data-variant="success"]')).toHaveLength(1);

        fireEvent.click(await within(dialog).findByRole('button', { name: /Przypnij: Faktura FV\/99\/2026/ }));
        expect(visitCostsApi.link).not.toHaveBeenCalled();
        expect(within(dialog).getByText('Faktura FV/99/2026 należy do wizyty #2026/0042')).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Przenieś do tej wizyty' }));
        await waitFor(() => expect(visitCostsApi.link).toHaveBeenCalledWith('v-1', 'c-9', true));

        fireEvent.click(within(dialog).getByRole('button', { name: /Przypnij: Faktura FV\/100\/2026/ }));
        await waitFor(() => expect(visitCostsApi.link).toHaveBeenLastCalledWith('v-1', 'c-10', false));
    });

    it('bez przypiętych kosztów podpowiada, co przypiąć', async () => {
        vi.mocked(visitCostsApi.get).mockResolvedValue(costs({
            documents: [], costNet: 0, costGross: 0, profitNet: 154_472, marginPercent: 100, countedDocuments: 0,
        }));
        renderSection();

        expect(await screen.findByText(/Przypnij faktury kosztowe, które dotyczą tej wizyty/)).toBeInTheDocument();
    });
});
