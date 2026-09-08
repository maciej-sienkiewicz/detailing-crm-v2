// @vitest-environment jsdom
//
// Checkbox „Czy powiadomić klienta o dodanych usługach?" obiecywał SMS-a także wtedy,
// gdy szablon „Propozycja dodatkowych usług" był wyłączony. Pracownik zaznaczał,
// zapisywał, i DOPIERO wtedy dowiadywał się, że szablon jest wyłączony — po fakcie.
// Ten hook rozstrzyga to zawczasu: bez szablonu w miejscu checkboxa staje informacja,
// co włączyć.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpsellNotificationAvailability } from './useUpsellNotificationAvailability';
import { fetchAutomationConfig } from '@/modules/sms-campaigns/api/smsCampaignsApi';
import type { SmsAutomationConfig } from '@/modules/sms-campaigns/types';

const capability = { enabled: true, isLoading: false };

vi.mock('@/modules/subscription', () => ({
    useCapability: () => capability,
}));

vi.mock('@/modules/sms-campaigns/api/smsCampaignsApi', () => ({
    fetchAutomationConfig: vi.fn(),
}));

const fetchConfig = vi.mocked(fetchAutomationConfig);

const configWith = (enabled: boolean, messageTemplate = '{{imie}}, propozycja: {{uslugi}}. {{link}}') =>
    ({ upsellSuggestion: { enabled, messageTemplate } }) as unknown as SmsAutomationConfig;

const wrapper = ({ children }: { children: ReactNode }) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const render = () => renderHook(() => useUpsellNotificationAvailability(true), { wrapper });

beforeEach(() => {
    capability.enabled = true;
    capability.isLoading = false;
    fetchConfig.mockReset();
});

describe('useUpsellNotificationAvailability', () => {
    it('włączony szablon pozwala powiadomić klienta', async () => {
        fetchConfig.mockResolvedValue(configWith(true));

        const { result } = render();

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.moduleEnabled).toBe(true);
        expect(result.current.templateReady).toBe(true);
    });

    it('wyłączony szablon zostawia moduł, ale odbiera możliwość wysyłki', async () => {
        fetchConfig.mockResolvedValue(configWith(false));

        const { result } = render();

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.moduleEnabled).toBe(true);
        expect(result.current.templateReady).toBe(false);
    });

    it('szablon włączony, ale pusty, liczy się jak wyłączony — nic by z niego nie wyszło', async () => {
        fetchConfig.mockResolvedValue(configWith(true, '   '));

        const { result } = render();

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.templateReady).toBe(false);
    });

    it('bez modułu komunikacji nie pytamy nawet o szablony', async () => {
        capability.enabled = false;

        const { result } = render();

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.moduleEnabled).toBe(false);
        expect(result.current.templateReady).toBe(false);
        expect(fetchConfig).not.toHaveBeenCalled();
    });
});
