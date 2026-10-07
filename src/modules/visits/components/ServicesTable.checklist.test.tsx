// @vitest-environment jsdom
//
// Lista kontrolna „zrobione” przy usługach wizyty (np. tablet na hali): tylko znak dla
// zespołu, włączany w ustawieniach. Przy wyłączonym ustawieniu tabela wygląda jak dotąd.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ServicesTable } from './ServicesTable';
import type { ServiceLineItem } from '../types';
import type { ServiceCheck } from '../api/serviceChecksApi';

const toggle = vi.fn();
let enabled = true;
let checks: ServiceCheck[] = [];

vi.mock('../hooks/useServiceChecklist', () => ({
    useServiceChecklist: () => ({
        enabled,
        checkOf: (id: string) => checks.find(c => c.serviceItemId === id),
        toggle,
    }),
}));
vi.mock('../hooks', () => ({
    useApproveServiceChange: () => ({ approveServiceChange: vi.fn(), isApproving: false }),
    useRejectServiceChange: () => ({ rejectServiceChange: vi.fn(), isRejecting: false }),
    useSaveServicesChanges: () => ({ saveServicesChanges: vi.fn(), isSaving: false }),
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

const service = (id: string, serviceName: string): ServiceLineItem => ({
    id, serviceId: 'svc-' + id, serviceName, basePriceNet: 154_472, basePriceGross: 190_000, vatRate: 23,
    requireManualPrice: false, adjustment: { type: 'PERCENT', value: 0 }, note: '',
    finalPriceNet: 154_472, finalPriceGross: 190_000, status: 'CONFIRMED',
});

const renderTable = () =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <ThemeProvider theme={theme}>
                <ServicesTable
                    services={[service('s-1', 'Powłoka ceramiczna'), service('s-2', 'Pranie tapicerki')]}
                    visitStatus="IN_PROGRESS"
                    visitId="v-1"
                />
            </ThemeProvider>
        </QueryClientProvider>,
    );

describe('ServicesTable - lista kontrolna „zrobione”', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        enabled = true;
        checks = [];
    });

    it('przy wyłączonym ustawieniu nie ma pól do odhaczania', () => {
        enabled = false;
        renderTable();
        expect(screen.queryByRole('checkbox', { name: /Zrobione/ })).toBeNull();
    });

    it('odhaczenie i odznaczenie wysyłają stan pola, a odhaczona usługa mówi kto i kiedy', () => {
        const at = new Date();
        at.setHours(14, 5, 0, 0);
        checks = [{ serviceItemId: 's-1', checkedAt: at.toISOString(), checkedByName: 'Marek Nowak' }];
        renderTable();

        const done = screen.getByRole('checkbox', { name: 'Zrobione: Powłoka ceramiczna' });
        const todo = screen.getByRole('checkbox', { name: 'Zrobione: Pranie tapicerki' });
        expect(done).toHaveAttribute('aria-checked', 'true');
        expect(todo).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByText('Zrobione, Marek Nowak, 14:05')).toBeInTheDocument();

        fireEvent.click(todo);
        fireEvent.click(done);
        expect(toggle).toHaveBeenNthCalledWith(1, 's-2', true);
        expect(toggle).toHaveBeenNthCalledWith(2, 's-1', false);
        expect(document.body.textContent).not.toContain('·');
    });
});
