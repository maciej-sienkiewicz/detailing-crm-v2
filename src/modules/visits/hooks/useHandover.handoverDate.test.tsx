// @vitest-environment jsdom
//
// Zgłoszenie biznesu z 05.11.2026: auto wyjechało, a „Wydaj pojazd" ktoś kliknął kilka dni
// później - wizyta, statystyki i dokumenty dostawały dzień kliknięcia. Po dniu planowanego
// zakończenia najpierw osobne okno pyta, z jaką datą zakończyć wizytę (HandoverDateModal);
// tu sprawdzamy, że odpowiedź dochodzi do żądania wydania.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHandover } from './useHandover';
import { stateTransitionApi } from '../api/stateTransitionApi';
import type { Visit } from '../types';
import type { HandoverDateState } from '../components/handover/handoverDate';

vi.mock('../api/stateTransitionApi', () => ({ stateTransitionApi: { complete: vi.fn() } }));
vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showError: vi.fn(), showInfo: vi.fn() }) }));
// Bez modułu Finanse: wydanie z paragonem pominiętym przez serwer - najkrótsza droga do zapisu.
vi.mock('@/modules/subscription', async importOriginal => ({
    ...(await importOriginal<typeof import('@/modules/subscription')>()),
    useCapability: () => ({ enabled: false }),
}));
vi.mock('@/core/permissions', async importOriginal => ({
    ...(await importOriginal<typeof import('@/core/permissions')>()),
    usePermissions: () => ({ can: () => false }),
}));
vi.mock('@/modules/finance/hooks', async importOriginal => ({
    ...(await importOriginal<typeof import('@/modules/finance/hooks')>()),
    useKsefAutomation: () => ({
        isLoading: false, moduleEnabled: false, configured: false, lacksIssuePermission: false,
        invoicesIssuedExternally: false, autoSendDefault: true,
    }),
}));
vi.mock('@/modules/settings/api/companySettingsQuery', async importOriginal => ({
    ...(await importOriginal<typeof import('@/modules/settings/api/companySettingsQuery')>()),
    companySettingsQuery: () => ({ queryKey: ['company-test'], queryFn: async () => ({ name: 'Studio', taxId: '5261040828' }) }),
}));
vi.mock('./useThankYouSmsAvailability', () => ({ useThankYouSmsAvailability: () => ({ available: false }) }));
vi.mock('@/modules/message-templates/hooks/useMessageDefaults', () => ({ useMessageDefaults: () => ({ sms: () => null }) }));
vi.mock('./useVisitStateConflict', () => ({ useVisitStateConflict: () => () => false }));

const complete = vi.mocked(stateTransitionApi.complete);

const visit = (estimatedCompletionDate: string | undefined): Visit => ({
    id: 'v-1',
    scheduledDate: '2026-10-30T08:00:00Z',
    estimatedCompletionDate,
    totalCost: { amount: 1230, currency: 'PLN' },
    customer: { firstName: 'Jan', lastName: 'Nowak', email: '', phone: '', companyNip: null, companyAddress: null },
    services: [{
        id: 's-1', serviceId: 's', serviceName: 'Korekta lakieru', basePriceNet: 100_000, vatRate: 23,
        requireManualPrice: false, adjustment: null, note: '', finalPriceNet: 100_000, finalPriceGross: 123_000,
        status: 'CONFIRMED',
    }],
}) as unknown as Visit;

const setup = (v: Visit, handoverDate?: HandoverDateState | null) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return renderHook(() => useHandover({ visit: v, isOpen: true, handoverDate }), { wrapper }).result;
};

const submitAndGetPickupDate = async (result: ReturnType<typeof setup>) => {
    expect(result.current.canSubmit).toBe(true);
    act(() => result.current.submit());
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    return complete.mock.calls[0][1].pickupDate;
};

describe('wydanie z datą wybraną w oknie przed rozliczeniem', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 5, 16, 30));
        window.localStorage.clear();
        complete.mockReset();
        complete.mockResolvedValue({ visitId: 'v-1', newStatus: 'COMPLETED', message: '', financialDocumentId: null, financialDocumentNumber: null });
    });
    afterEach(() => vi.useRealTimers());

    it('„Zgodnie z planowaną datą” wysyła dzień planu', async () => {
        const result = setup(visit('2026-11-02T14:00:00Z'), { choice: 'PLANNED', other: '' });

        expect(result.current.pickupDate).toBe('2026-11-02');
        expect(await submitAndGetPickupDate(result)).toBe('2026-11-02');
    });

    it('„Z inną datą” wysyła wpisany dzień', async () => {
        const result = setup(visit('2026-11-02T14:00:00Z'), { choice: 'OTHER', other: '2026-11-03' });

        expect(await submitAndGetPickupDate(result)).toBe('2026-11-03');
    });

    it('„Z datą dzisiejszą” wysyła wydanie bez daty, jak dotąd', async () => {
        const result = setup(visit('2026-11-02T14:00:00Z'), { choice: 'TODAY', other: '' });

        expect(await submitAndGetPickupDate(result)).toBeUndefined();
    });

    it('bez okna daty wydanie jest dzisiejsze', async () => {
        const result = setup(visit('2026-11-02T14:00:00Z'), null);

        expect(await submitAndGetPickupDate(result)).toBeUndefined();
    });

    it('odpowiedź sprzed dnia planu nie przecieka do żądania', async () => {
        // W dniu planu pytania nie ma - stara odpowiedź nie może cofnąć daty wydania.
        const result = setup(visit('2026-11-05T09:00:00Z'), { choice: 'PLANNED', other: '' });

        expect(result.current.pickupDate).toBeUndefined();
        expect(await submitAndGetPickupDate(result)).toBeUndefined();
    });
});
