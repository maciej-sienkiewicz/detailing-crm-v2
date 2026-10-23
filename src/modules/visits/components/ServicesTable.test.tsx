// @vitest-environment jsdom
//
// „Popraw rozliczenie” mieszka w menu sekcji Usługi (decyzja biznesu): poprawia się ceny
// i dokument tych usług, więc akcja stoi przy nich, a nie w nagłówku wizyty.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ServicesTable } from './ServicesTable';
import type { ServiceLineItem } from '../types';

vi.mock('../hooks', () => ({
    useApproveServiceChange: () => ({ approveServiceChange: vi.fn(), isApproving: false }),
    useRejectServiceChange: () => ({ rejectServiceChange: vi.fn(), isRejecting: false }),
    useSaveServicesChanges: () => ({ saveServicesChanges: vi.fn(), isSaving: false }),
}));
vi.mock('../hooks/useServiceChecklist', () => ({
    useServiceChecklist: () => ({ enabled: false, checkOf: () => undefined, toggle: vi.fn() }),
}));
vi.mock('../hooks/usePrintServicesList', () => ({
    usePrintServicesList: () => ({ print: vi.fn(), isPrinting: false }),
}));
vi.mock('@/modules/calendar/components/QuickServiceModal', () => ({ QuickServiceModal: () => null }));
// Tabela pyta o prawo do edycji usług (VISITS_CREATE i dane osobowe - personalDataActions).
// Domyślnie właściciel z pełnym dostępem; `granted` podmienia zestaw na czas jednego testu.
let granted: string[] | null = null;
const can = (required: string | string[]) =>
    granted == null || (Array.isArray(required) ? required : [required]).some(code => granted!.includes(code));
vi.mock('@/core/permissions', async importOriginal => {
    const original = await importOriginal<typeof import('@/core/permissions')>();
    return {
        ...original,
        usePermissions: () => ({ isOwner: granted == null, can, defaultRoute: '/' }),
        usePersonalDataActions: () => original.personalDataActions(can),
    };
});
vi.mock('@/modules/subscription', () => ({
    useFeature: () => ({ enabled: true }),
    UpsellModal: () => null,
}));

const service: ServiceLineItem = {
    id: 's-1', serviceId: 'svc-1', serviceName: 'Przygotowanie do sprzedaży', basePriceNet: 154_472,
    basePriceGross: 190_000, vatRate: 23, requireManualPrice: false, adjustment: { type: 'PERCENT', value: 0 }, note: '',
    finalPriceNet: 154_472, finalPriceGross: 190_000, status: 'CONFIRMED',
};

const renderTable = (onCorrectSettlement?: () => void, visitStatus: 'COMPLETED' | 'IN_PROGRESS' = 'COMPLETED') => {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <ThemeProvider theme={theme}>
                <ServicesTable
                    services={[service]}
                    visitStatus={visitStatus}
                    visitId="v-1"
                    settlement={{ documentType: 'INVOICE', revenueInvoiceId: null }}
                    onCorrectSettlement={onCorrectSettlement}
                />
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

describe('ServicesTable - poprawka rozliczenia w menu sekcji Usługi', () => {
    afterEach(cleanup);

    it('menu sekcji ma „Popraw rozliczenie” i otwiera poprawkę', () => {
        const onCorrect = vi.fn();
        renderTable(onCorrect);
        fireEvent.click(screen.getByRole('button', { name: 'Więcej opcji usług' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Popraw rozliczenie' }));
        expect(onCorrect).toHaveBeenCalledOnce();
    });

    it('bez uprawnienia albo przed wydaniem pozycji nie ma', () => {
        renderTable(undefined);
        fireEvent.click(screen.getByRole('button', { name: 'Więcej opcji usług' }));
        expect(screen.queryByRole('menuitem', { name: 'Popraw rozliczenie' })).toBeNull();
        expect(screen.getByRole('menuitem', { name: 'Drukuj wykaz' })).toBeInTheDocument();
    });
});

// Zgłoszenie: przy „Faktura + inny dokument” plakietka pokazywała „Bez paragonu 4920,00 zł”,
// a dokument był na 4000 zł - reszta jest bez VAT, więc jej kwotą jest netto części usługi.
// Usługa 18 450 zł brutto, rabat przy wydaniu 1230 zł → 17 220 zł brutto (14 000 zł netto),
// na fakturze 12 300 zł brutto (10 000 zł netto), reszta 4000 zł bez VAT.
describe('ServicesTable - plakietki rozliczenia „Faktura + inny dokument”', () => {
    afterEach(cleanup);

    const split: ServiceLineItem = {
        ...service, basePriceNet: 1_500_000, basePriceGross: 1_845_000,
        finalPriceNet: 1_400_000, finalPriceGross: 1_722_000, priceBeforeHandoverGross: 1_845_000,
        adjustment: { type: 'SET_GROSS', value: 1_722_000 },
    };
    const renderSplit = (restNet: number | null | undefined) => render(
        <QueryClientProvider client={new QueryClient()}>
            <ThemeProvider theme={theme}>
                <ServicesTable
                    services={[split]}
                    visitStatus="COMPLETED"
                    visitId="v-1"
                    settlement={{
                        documentType: 'INVOICE', revenueInvoiceId: 'inv-1', documents: [
                            { id: 'd-inv', number: 'FAK/2026/0001', type: 'INVOICE', withoutReceipt: false, invoicedExternally: false,
                                paymentMethod: 'CARD', totalGross: 1_230_000,
                                services: [{ serviceLineItemId: 's-1', grossCents: 1_230_000, netCents: 1_000_000 }] },
                            { id: 'd-rest', number: 'DOK/2026/0001', type: 'OTHER', withoutReceipt: true, invoicedExternally: false,
                                paymentMethod: 'CASH', totalGross: 400_000,
                                services: [{ serviceLineItemId: 's-1', grossCents: 492_000, netCents: restNet }] },
                        ],
                    }}
                />
            </ThemeProvider>
        </QueryClientProvider>,
    );

    it('każda kwota mówi, czym jest: rabat i faktura brutto, inny dokument bez VAT', () => {
        renderSplit(400_000);
        expect(screen.getAllByText(/^Rabat przy wydaniu 1\s?230,00\szł brutto$/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/^Faktura 12\s300,00\szł brutto$/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/^Inny dokument 4000,00\szł bez VAT$/).length).toBeGreaterThan(0);
        expect(screen.queryByText(/4920/)).toBeNull();
        expect(screen.queryByText(/Bez paragonu/i)).toBeNull();
    });

    it('„Do zapłaty” to kwoty dokumentów, jak na ekranie wydania, a nie brutto usług z VAT-em', () => {
        renderSplit(400_000);
        expect(screen.getAllByText(/^16\s300,00\szł$/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/^faktura 12\s300,00\szł brutto \+ inny dokument 4000,00\szł bez VAT$/).length).toBeGreaterThan(0);
        expect(screen.queryByText(/^17\s220,00\szł$/)).not.toBeNull(); // cena usługi w wierszu zostaje
    });

    it('starszy serwer bez netto: nazwa dokumentu bez kwoty, a nie brutto z VAT-em', () => {
        renderSplit(undefined);
        expect(screen.getAllByText(/^Inny dokument$/).length).toBeGreaterThan(0);
        expect(screen.queryByText(/4920/)).toBeNull();
    });
});

// Zmiana usług i cen to edycja wizyty: bez danych osobowych (CUSTOMERS_VIEW zdjęte bramką
// planu przy zostawionym VISITS_CREATE) nie ma ani „Dodaj usługę", ani rabatu i VAT zbiorczego.
describe('ServicesTable - edycja usług a dane osobowe', () => {
    afterEach(() => { cleanup(); granted = null; });

    it('bez danych osobowych edycji usług nie widać', () => {
        granted = ['VISITS_VIEW', 'VISITS_SERVICE_PRICES_VIEW', 'VISITS_CREATE'];
        renderTable(undefined, 'IN_PROGRESS');
        expect(screen.queryByRole('button', { name: /Dodaj usługę/ })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Rabat i VAT dla całej wizyty' })).toBeNull();
    });

    it('z danymi osobowymi edycja usług jest dostępna', () => {
        granted = ['VISITS_VIEW', 'CUSTOMERS_VIEW', 'VISITS_SERVICE_PRICES_VIEW', 'VISITS_CREATE'];
        renderTable(undefined, 'IN_PROGRESS');
        expect(screen.getByRole('button', { name: /Dodaj usługę/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Rabat i VAT dla całej wizyty' })).toBeInTheDocument();
    });
});
