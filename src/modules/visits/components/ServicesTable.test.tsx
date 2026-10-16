// @vitest-environment jsdom
//
// „Popraw rozliczenie” mieszka w menu sekcji Usługi (decyzja biznesu): poprawia się ceny
// i dokument tych usług, więc akcja stoi przy nich, a nie w nagłówku wizyty.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ServicesTable } from './ServicesTable';
import type { ServiceLineItem } from '../types';

const { approveServiceChange, rejectServiceChange } = vi.hoisted(() => ({
    approveServiceChange: vi.fn(),
    rejectServiceChange: vi.fn(),
}));

vi.mock('../hooks', () => ({
    useApproveServiceChange: () => ({ approveServiceChange, isApproving: false }),
    useRejectServiceChange: () => ({ rejectServiceChange, isRejecting: false }),
    useSaveServicesChanges: () => ({ saveServicesChanges: vi.fn(), isSaving: false }),
}));
vi.mock('../hooks/useServiceChecklist', () => ({
    useServiceChecklist: () => ({ enabled: false, checkOf: () => undefined, toggle: vi.fn() }),
}));
vi.mock('../hooks/usePrintServicesList', () => ({
    usePrintServicesList: () => ({ print: vi.fn(), isPrinting: false }),
}));
vi.mock('@/modules/calendar/components/QuickServiceModal', () => ({ QuickServiceModal: () => null }));
// Tabela pyta o prawo do edycji usług (VISITS_CREATE) - tu właściciel z pełnym dostępem.
vi.mock('@/core/permissions', async importOriginal => ({
    ...(await importOriginal<typeof import('@/core/permissions')>()),
    usePermissions: () => ({ isOwner: true, can: () => true, defaultRoute: '/' }),
}));
vi.mock('@/modules/subscription', () => ({
    useFeature: () => ({ enabled: true }),
    UpsellModal: () => null,
}));

const service: ServiceLineItem = {
    id: 's-1', serviceId: 'svc-1', serviceName: 'Przygotowanie do sprzedaży', basePriceNet: 154_472,
    basePriceGross: 190_000, vatRate: 23, requireManualPrice: false, adjustment: { type: 'PERCENT', value: 0 }, note: '',
    finalPriceNet: 154_472, finalPriceGross: 190_000, status: 'CONFIRMED',
};

const renderTable = (onCorrectSettlement?: () => void) => {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <ThemeProvider theme={theme}>
                <ServicesTable
                    services={[service]}
                    visitStatus="COMPLETED"
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

describe('ServicesTable - decyzja o zmianie czekającej na zgodę klienta', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    const pendingEdit: ServiceLineItem = {
        ...service,
        status: 'PENDING',
        pendingOperation: 'EDIT',
        hasPendingChange: true,
        previousPriceNet: 40_650,
        previousPriceGross: 50_000,
    };

    const openConfirm = (action: 'Zatwierdź zmianę' | 'Wycofaj zmianę') => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <ThemeProvider theme={theme}>
                    <ServicesTable services={[pendingEdit]} visitStatus="IN_PROGRESS" visitId="v-1" />
                </ThemeProvider>
            </QueryClientProvider>,
        );
        // W jsdom tabela renderuje się jako lista telefonu: menu akcji otwiera cała pozycja.
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${pendingEdit.serviceName}`) }));
        fireEvent.click(screen.getByRole('menuitem', { name: action }));
    };

    // Zgłoszenie: 5xx przy „Zatwierdź" zamykał okno (onSettled), usługa zostawała PENDING,
    // a „Gotowe do odbioru" odmawiało. Okno ma zniknąć dopiero po udanym zapisie.
    it('okno zatwierdzenia zostaje otwarte do odpowiedzi serwera i znika dopiero po sukcesie', () => {
        openConfirm('Zatwierdź zmianę');
        fireEvent.click(screen.getByRole('button', { name: 'Zatwierdź' }));

        expect(approveServiceChange).toHaveBeenCalledWith(pendingEdit.id, { onSuccess: expect.any(Function) });
        expect(screen.getByRole('dialog', { name: 'Zatwierdzić zmianę?' })).toBeInTheDocument();

        act(() => approveServiceChange.mock.calls[0][1].onSuccess());
        expect(screen.queryByRole('dialog', { name: 'Zatwierdzić zmianę?' })).toBeNull();
    });

    it('wycofanie działa tak samo: bez sukcesu okno nie znika', () => {
        openConfirm('Wycofaj zmianę');
        fireEvent.click(screen.getByRole('button', { name: 'Wycofaj' }));

        expect(rejectServiceChange).toHaveBeenCalledWith(pendingEdit.id, { onSuccess: expect.any(Function) });
        expect(screen.getByRole('dialog', { name: 'Wycofać zmianę?' })).toBeInTheDocument();
    });
});
