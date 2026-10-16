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
