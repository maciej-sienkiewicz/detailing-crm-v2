// @vitest-environment jsdom
//
// Ekran wydania liczy kwotę tak, jak liczy ją backend (Visit.settledGross), przez
// prawdziwą wycenę pozycji (useServicePricing). Dwa zgłoszenia, od których to powstało:
//  - ekran pokazywał 2200 zł, sprzedawca pobrał 2200, a paragon wyszedł na 1900 zł
//    (usługa dopisana i czekająca na zgodę klienta liczyła się do kwoty),
//  - na fakturze serwer odrzucał wydanie „Kwota faktury przekracza kwotę wizyty",
//    bo pozycje faktury zasiano ze wszystkich usług.
// I jeden z commita 7fa63b4: nieudany odczyt ustawień firmy nie jest „brakiem NIP-u".
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHandover } from './useHandover';
import { companyApi } from '@/modules/settings/api/companyApi';
import { stateTransitionApi } from '../api/stateTransitionApi';
import { invoiceGrossOf, parsePln } from '../types/handover';
import type { ServiceLineItem, Visit } from '../types';

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError: vi.fn(), showInfo: vi.fn(), showSuccess: vi.fn(), showWarning: vi.fn() }),
}));
vi.mock('@/modules/subscription', () => ({
    useCapability: () => ({ enabled: true, isLoading: false }),
}));
vi.mock('@/modules/finance/hooks', () => ({
    useKsefAutomation: () => ({
        moduleEnabled: false,
        configured: false,
        lacksIssuePermission: false,
        autoSendDefault: undefined,
        invoicesIssuedExternally: false,
        isLoading: false,
    }),
}));
vi.mock('@/modules/settings/api/companyApi', () => ({
    companyApi: { getCompanySettings: vi.fn() },
}));
vi.mock('../api/stateTransitionApi', () => ({
    stateTransitionApi: { complete: vi.fn() },
}));
vi.mock('./useThankYouSmsAvailability', () => ({
    useThankYouSmsAvailability: () => ({ available: false, isLoading: false }),
}));
vi.mock('@/modules/message-templates/hooks/useMessageDefaults', () => ({
    useMessageDefaults: () => ({ sms: () => undefined, email: () => undefined }),
}));

const getCompanySettings = vi.mocked(companyApi.getCompanySettings);
const complete = vi.mocked(stateTransitionApi.complete);

const COMPANY = { name: 'Detailing Studio', taxId: '5271234567' } as Awaited<ReturnType<typeof companyApi.getCompanySettings>>;

/** Pozycja wizyty bez rabatu, cena wpisana jako brutto (dokładne brutto w basePriceGross). */
const service = (
    id: string,
    serviceName: string,
    net: number,
    gross: number,
    overrides: Partial<ServiceLineItem> = {}
): ServiceLineItem => ({
    id,
    serviceId: `svc-${id}`,
    serviceName,
    basePriceNet: net,
    basePriceGross: gross,
    vatRate: 23,
    requireManualPrice: false,
    adjustment: { type: 'PERCENT', value: 0 },
    note: '',
    finalPriceNet: net,
    finalPriceGross: gross,
    status: 'CONFIRMED',
    pendingOperation: null,
    hasPendingChange: false,
    previousPriceNet: null,
    previousPriceGross: null,
    ...overrides,
});

const pending = (operation: 'ADD' | 'EDIT' | 'DELETE', extra: Partial<ServiceLineItem> = {}): Partial<ServiceLineItem> => ({
    status: 'PENDING',
    pendingOperation: operation,
    hasPendingChange: true,
    ...extra,
});

const COATING = service('a', 'Powłoka ceramiczna', 154_472, 190_000);
const RIMS_PENDING_ADD = service('b', 'Czyszczenie felg', 24_390, 30_000, pending('ADD'));
// Zmiana 500,00 → 800,00 czeka na zgodę klienta: backend rozlicza 500,00 (confirmedSnapshot).
const UPHOLSTERY_PENDING_EDIT = service(
    'c', 'Pranie tapicerki', 65_041, 80_000,
    pending('EDIT', { previousPriceNet: 40_650, previousPriceGross: 50_000 })
);
const OZONE_REJECTED = service('d', 'Ozonowanie', 16_260, 20_000, { status: 'REJECTED' });
const FRESHENER_PENDING_DELETE = service('e', 'Odświeżacz', 8_130, 10_000, pending('DELETE'));

const visitWith = (services: ServiceLineItem[]): Visit =>
    ({
        id: 'visit-1',
        title: '',
        visitNumber: 'W/1/2026',
        status: 'READY_FOR_PICKUP',
        scheduledDate: '2026-10-16',
        vehicle: { id: 'v', licensePlate: 'WX 12345', brand: 'Audi', model: 'A4', yearOfProduction: 2020, color: '' },
        customer: {
            id: 'c',
            firstName: 'Jan',
            lastName: 'Kowalski',
            email: '',
            phone: '',
            stats: { totalVisits: 1, totalSpent: null, vehiclesCount: 1 },
        },
        services,
        totalCost: null,
        keysHandedOver: true,
        documentsHandedOver: true,
        colorId: '',
        createdAt: '2026-10-16T08:00:00Z',
        updatedAt: '2026-10-16T08:00:00Z',
    }) as Visit;

const setup = (services: ServiceLineItem[]) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return renderHook(() => useHandover({ visit: visitWith(services), isOpen: true }), { wrapper });
};

describe('useHandover: kwota wydania to kwota, za którą backend wystawi dokument', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        getCompanySettings.mockResolvedValue(COMPANY);
        complete.mockResolvedValue({
            visitId: 'visit-1', newStatus: 'completed', message: 'ok',
            financialDocumentId: null, financialDocumentNumber: null,
        });
    });

    it('„2200 na ekranie, 1900 na paragonie": usługa czekająca na zgodę nie wchodzi do kwoty', () => {
        const { result } = setup([COATING, RIMS_PENDING_ADD]);

        // 1900,00 brutto wpisane w brutto zostaje dokładne, VAT to różnica: 35528, nie 35529.
        expect(result.current.totals).toEqual({ net: 154_472, gross: 190_000, vat: 35_528 });
        expect(result.current.pendingChanges).toBe(1);
        expect(result.current.state.items.map(item => item.name)).toEqual(['Powłoka ceramiczna']);
    });

    it('edycja czekająca na zgodę po starej cenie, usunięcie w pełnej, odrzucona poza kwotą', () => {
        const { result } = setup([
            COATING, RIMS_PENDING_ADD, UPHOLSTERY_PENDING_EDIT, OZONE_REJECTED, FRESHENER_PENDING_DELETE,
        ]);

        // Visit.calculateTotalGross/Net dla tych pozycji.
        expect(result.current.totals).toEqual({ net: 203_252, gross: 250_000, vat: 46_748 });
        expect(result.current.pendingChanges).toBe(3);
        expect(result.current.state.items.map(item => [item.name, item.gross])).toEqual([
            ['Powłoka ceramiczna', '1900.00'],
            ['Pranie tapicerki', '500.00'],
            ['Odświeżacz', '100.00'],
        ]);
    });

    it('faktura zasiana z pozycji domyka kwotę wizyty: brak przeszkód, ta sama kwota idzie do serwera', async () => {
        const { result } = setup([
            COATING, RIMS_PENDING_ADD, UPHOLSTERY_PENDING_EDIT, OZONE_REJECTED, FRESHENER_PENDING_DELETE,
        ]);
        await waitFor(() => expect(result.current.isCompanyLoading).toBe(false));

        expect(result.current.state.documentType).toBe('INVOICE');
        expect(invoiceGrossOf(result.current.state.items)).toBe(250_000);
        expect(result.current.remainder).toBe(0);
        expect(result.current.problems).toEqual([]);

        result.current.submit();
        await waitFor(() => expect(complete).toHaveBeenCalled());
        const payload = complete.mock.calls[0][1];
        expect(payload.payment.amount).toBe(250_000);
        const invoiceGross = payload.invoice!.items.reduce((sum, item) => sum + (item.unitPriceGross ?? 0), 0);
        expect(invoiceGross).toBe(250_000);
        expect(payload.invoice!.items.map(item => item.unitPriceGross)).toEqual([
            parsePln('1900.00'), parsePln('500.00'), parsePln('100.00'),
        ]);
    });
});

describe('useHandover: dane sprzedawcy (7fa63b4)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
    });

    it('nieudany odczyt ustawień firmy nie jest „brakiem NIP-u": żadnej przeszkody „seller"', async () => {
        getCompanySettings.mockRejectedValue({ response: { status: 500 } });
        const { result } = setup([COATING]);

        await waitFor(() => expect(getCompanySettings).toHaveBeenCalled());
        await waitFor(() => expect(result.current.isCompanyLoading).toBe(false));

        expect(result.current.state.documentType).toBe('INVOICE');
        expect(result.current.problems.some(problem => problem.section === 'seller')).toBe(false);
        expect(result.current.canSubmit).toBe(true);
    });

    it('wczytane ustawienia bez NIP-u nadal blokują fakturę przeszkodą „seller"', async () => {
        getCompanySettings.mockResolvedValue({ ...COMPANY, taxId: '' });
        const { result } = setup([COATING]);

        await waitFor(() => expect(result.current.company).toBeDefined());

        expect(result.current.problems.some(problem => problem.section === 'seller')).toBe(true);
        expect(result.current.canSubmit).toBe(false);
    });
});
