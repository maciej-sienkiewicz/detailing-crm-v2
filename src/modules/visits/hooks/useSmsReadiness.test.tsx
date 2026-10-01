// @vitest-environment jsdom
//
// Wysyłka wyłączona przez nieaktywny abonament to nie „brak modułu": kreator nie może
// prowadzić do zakupu modułu, który studio ma (i którego i tak nie da się teraz kupić).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSmsReadiness } from './useSmsReadiness';

const capability = {
    enabled: false,
    isLoading: false,
    lockedBySubscription: false,
    displayName: 'Wysyłka wiadomości',
    missingFeatures: [] as { displayName: string }[],
    upsell: [] as { monthlyPriceGrossCents: number | null }[],
};

vi.mock('@/modules/subscription', () => ({
    useCapability: () => capability,
}));

vi.mock('@/modules/settings/hooks/useSmsCredits', () => ({
    useSmsCreditBalance: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@/modules/sms-campaigns/api/smsCampaignsApi', () => ({
    fetchAutomationConfig: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

const readiness = () => renderHook(() => useSmsReadiness({ customerPhone: '534920205' }), { wrapper }).result.current;

describe('useSmsReadiness', () => {
    beforeEach(() => {
        capability.enabled = false;
        capability.lockedBySubscription = false;
        capability.missingFeatures = [{ displayName: 'Komunikacja z klientem' }];
        capability.upsell = [{ monthlyPriceGrossCents: 3900 }];
    });

    it('brak modułu: wymaganie do naprawienia w kreatorze, z ceną modułu', () => {
        const module = readiness().requirements.find(r => r.id === 'module')!;
        expect(module.label).toBe('Moduł Komunikacja z klientem');
        expect(module.detail).toBe('39,00 zł/mies.');
        expect(module.fixable).toBe(true);
    });

    it('nieaktywny abonament: „Abonament, wymaga odnowienia", bez zakupu modułu w kreatorze', () => {
        capability.lockedBySubscription = true;
        capability.missingFeatures = [];
        capability.upsell = [];

        const result = readiness();
        const module = result.requirements.find(r => r.id === 'module')!;
        expect(module).toMatchObject({ status: 'missing', label: 'Abonament', detail: 'wymaga odnowienia', fixable: false });
        expect(result.requirements.some(r => /moduł/i.test(r.label))).toBe(false);
        expect(result.requirements.find(r => r.id === 'credits')!.detail).toBe('sprawdzimy po odnowieniu abonamentu');
        expect(result.ready).toBe(false);
    });
});
