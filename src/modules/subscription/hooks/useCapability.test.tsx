// @vitest-environment jsdom
//
// Funkcja wyłączona przez nieaktywny abonament to nie „brak modułu": żadnego
// „Wymaga modułu: X" ani oferty dokupienia - studio często ten moduł ma, a brakuje
// mu przedłużenia.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCapability } from './useCapability';
import { newSubscriptionApi } from '../api/subscriptionApi';
import type { CapabilityStatus, EntitlementsResponse } from '../types';

vi.mock('../api/subscriptionApi', () => ({
    newSubscriptionApi: { getEntitlements: vi.fn() },
}));

const capability = (overrides: Partial<CapabilityStatus>): CapabilityStatus => ({
    enabled: false,
    displayName: 'Wysyłka SMS',
    missingFeatures: [{ key: 'SMS_EMAIL', displayName: 'Automatyzacja SMS i E-mail' }],
    upsell: [{ addOnKey: 'CLIENT_COMMUNICATION', addOnName: 'Komunikacja', monthlyPriceGrossCents: 4900, isAvailable: true }],
    lockedBy: 'MODULE',
    ...overrides,
});

const entitlements = (cap: CapabilityStatus, subscriptionActive = true) => ({
    plan: { key: 'BASIC', name: 'Basic', monthlyPriceGrossCents: 12300 },
    features: {},
    capabilities: { COMM_SEND_TRANSACTIONAL: cap },
    activeAddOns: [],
    billingStatus: subscriptionActive ? 'ACTIVE' : 'EXPIRED',
    subscriptionActive,
}) as unknown as EntitlementsResponse;

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useCapability', () => {
    it('brak modułu: „Wymaga modułu" i oferta dokupienia', async () => {
        vi.mocked(newSubscriptionApi.getEntitlements).mockResolvedValue(entitlements(capability({})));
        const { result } = renderHook(() => useCapability('COMM_SEND_TRANSACTIONAL'), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.lockReason).toBe('Wymaga modułu: Automatyzacja SMS i E-mail');
        expect(result.current.lockedBySubscription).toBe(false);
        expect(result.current.upsell).toHaveLength(1);
    });

    it('lockedBy SUBSCRIPTION: odnowienie zamiast modułu, bez oferty dokupienia', async () => {
        vi.mocked(newSubscriptionApi.getEntitlements).mockResolvedValue(
            entitlements(capability({ lockedBy: 'SUBSCRIPTION' }), false),
        );
        const { result } = renderHook(() => useCapability('COMM_SEND_TRANSACTIONAL'), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.lockedBySubscription).toBe(true);
        expect(result.current.lockReason).toBe('Wymaga odnowienia abonamentu');
        expect(result.current.missingFeatures).toEqual([]);
        expect(result.current.upsell).toEqual([]);
    });

    it('włączona funkcja nie jest zablokowana, nawet z kodem w polu', async () => {
        vi.mocked(newSubscriptionApi.getEntitlements).mockResolvedValue(
            entitlements(capability({ enabled: true, missingFeatures: [], upsell: [], lockedBy: null })),
        );
        const { result } = renderHook(() => useCapability('COMM_SEND_TRANSACTIONAL'), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.enabled).toBe(true);
        expect(result.current.lockReason).toBeNull();
        expect(result.current.lockedBySubscription).toBe(false);
    });
});
