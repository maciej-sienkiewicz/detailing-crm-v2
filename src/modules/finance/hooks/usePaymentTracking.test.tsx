// @vitest-environment jsdom
//
// Dwa przełączniki, dwie rzeczy: „Pokaż kolumnę ze statusem płatności" decyduje, czy status
// widać przy dokumentach, a „Obsługa statusów płatności" - czy status wpływa na sumy.
// Zgłoszenie z 30.10.2026: studio z wyłączoną obsługą i włączoną kolumną nie widziało
// statusu, bo widok pytał wyłącznie o obsługę statusów.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePaymentStatusVisible } from './usePaymentTracking';
import { financeApi } from '../api/financeApi';
import { ksefApi } from '../api/ksefApi';

vi.mock('@/modules/subscription', () => ({ useCapability: () => ({ enabled: true, isLoading: false }) }));
vi.mock('../api/financeApi', () => ({ financeApi: { getFinanceConfig: vi.fn() } }));
vi.mock('../api/ksefApi', () => ({ ksefApi: { getInvoicingStatus: vi.fn() } }));

const invoicing = (paymentStatusColumnVisible?: boolean) => ({
    configured: true, tokenChecked: true, tokenValid: true, permissionsKnown: true, canIssueInvoices: true,
    checkedAt: null, autoSendDefault: false, invoicesIssuedExternally: true, paymentStatusColumnVisible,
});

const visible = async (tracking: boolean, column: boolean | undefined) => {
    vi.mocked(financeApi.getFinanceConfig).mockResolvedValue({ paymentTrackingEnabled: tracking });
    vi.mocked(ksefApi.getInvoicingStatus).mockResolvedValue(invoicing(column));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => usePaymentStatusVisible(), { wrapper });
    await waitFor(() => expect(ksefApi.getInvoicingStatus).toHaveBeenCalled());
    await waitFor(() => expect(financeApi.getFinanceConfig).toHaveBeenCalled());
    // Obie odpowiedzi muszą dojść, zanim wynik coś znaczy.
    await new Promise(resolve => setTimeout(resolve, 0));
    return result;
};

describe('usePaymentStatusVisible', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('kolumna włączona przy wyłączonej obsłudze statusów pokazuje status (zgłoszenie)', async () => {
        const result = await visible(false, true);
        await waitFor(() => expect(result.current).toBe(true));
    });

    it('kolumna wyłączona chowa status także przy włączonej obsłudze', async () => {
        const result = await visible(true, false);
        await waitFor(() => expect(result.current).toBe(false));
    });

    it('bez wartości z serwera status idzie za obsługą statusów, jak przed tym ustawieniem', async () => {
        expect((await visible(false, undefined)).current).toBe(false);
        cleanup();
        const on = await visible(true, undefined);
        await waitFor(() => expect(on.current).toBe(true));
    });
});
