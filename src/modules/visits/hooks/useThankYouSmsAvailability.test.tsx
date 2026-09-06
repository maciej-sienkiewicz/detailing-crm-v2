// @vitest-environment jsdom
//
// „Podziękowanie po wizycie" wyłączone w Ustawieniach → Szablony znaczy, że studio
// takich SMS-ów nie wysyła w ogóle. Pole wyboru godziny przy wydaniu pojazdu jest
// wtedy pytaniem o coś, co i tak nie nastąpi - więc go nie ma.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useThankYouSmsAvailability } from './useThankYouSmsAvailability';
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

const configWithPostVisit = (enabled: boolean, messageTemplate = 'Dziękujemy, {{imie}}!') =>
    ({
        postVisit: { enabled, offsetMinutes: 30, messageTemplate },
    }) as unknown as SmsAutomationConfig;

const wrapper = ({ children }: { children: ReactNode }) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const renderAvailability = (phone: string | null = '534920205') =>
    renderHook(() => useThankYouSmsAvailability({ enabled: true, customerPhone: phone }), { wrapper });

beforeEach(() => {
    capability.enabled = true;
    capability.isLoading = false;
    fetchConfig.mockReset();
});

describe('useThankYouSmsAvailability', () => {
    it('włączony szablon podziękowania pokazuje wybór', async () => {
        fetchConfig.mockResolvedValue(configWithPostVisit(true));

        const { result } = renderAvailability();

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.available).toBe(true);
    });

    it('wyłączony szablon chowa wybór', async () => {
        fetchConfig.mockResolvedValue(configWithPostVisit(false));

        const { result } = renderAvailability();

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.available).toBe(false);
    });

    it('szablon włączony, ale pusty, też chowa wybór', async () => {
        // Reguła wygląda na aktywną, a nic nie wychodzi - backend nazywa to `sendable`.
        fetchConfig.mockResolvedValue(configWithPostVisit(true, '   '));

        const { result } = renderAvailability();

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.available).toBe(false);
    });

    it('bez modułu wysyłki nie pytamy nawet o szablon', async () => {
        capability.enabled = false;

        const { result } = renderAvailability();

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.available).toBe(false);
        expect(fetchConfig).not.toHaveBeenCalled();
    });

    it('klient bez numeru telefonu nie ma jak dostać podziękowania', async () => {
        fetchConfig.mockResolvedValue(configWithPostVisit(true));

        const { result } = renderAvailability(null);

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.available).toBe(false);
    });

    it('w trakcie wczytywania ustawień nie pokazujemy nic', () => {
        fetchConfig.mockReturnValue(new Promise(() => {}));

        const { result } = renderAvailability();

        expect(result.current.isLoading).toBe(true);
        expect(result.current.available).toBe(false);
    });
});
