// @vitest-environment jsdom
//
// Aplikacja ze sklepu (App Store 3.1.1, Google Play): każde „brak modułu" stoi na
// useAddOnUnlock i ModuleGateCard, więc tam zapada decyzja, że w aplikacji niczego
// się nie odblokowuje - nie ma ceny, „Odblokuj", linku do pakietu FULL ani okna
// płatności. Odrzucona akcja (402) dalej mówi, czemu się nie udała.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { useAddOnUnlock } from './hooks/useAddOnUnlock';
import { ModuleGateCard } from './components/ModuleGate';
import { PaywallListener } from './components/PaywallListener';
import { newSubscriptionApi } from './api/subscriptionApi';
import type { PaywallErrorResponse } from './types';

const platform = vi.hoisted(() => ({ purchasable: false }));

vi.mock('@/core/native/platform', () => ({
    canPurchaseHere: () => platform.purchasable,
    isNativeApp: () => !platform.purchasable,
}));

vi.mock('@/core/permissions/usePermissions', () => ({
    usePermissions: () => ({ isOwner: true, can: () => true, defaultRoute: '/' }),
}));

vi.mock('./api/subscriptionApi', () => ({
    newSubscriptionApi: { previewAddOn: vi.fn() },
}));

const card = (
    <ThemeProvider theme={theme}>
        <ModuleGateCard
            title="Automatyzacja kontaktu z klientem"
            subtitle="Poniżej podgląd tego, co zyskasz po odblokowaniu:"
            benefits={['Przypomnienia przed wizytą']}
            addOnKey="CLIENT_COMMUNICATION"
            priceCents={4900}
            isAvailable
            isOwner
            onUnlock={() => {}}
        />
    </ThemeProvider>
);

const paywall: PaywallErrorResponse = {
    code: 'MODULE_REQUIRED',
    error: 'Payment Required',
    message: 'Ta funkcja wymaga modułu',
    capability: 'COMM_SEND_TRANSACTIONAL',
    capabilityDisplayName: 'Wysyłka SMS',
    missingFeatures: [],
    upsell: [{ addOnKey: 'CLIENT_COMMUNICATION', addOnName: 'Komunikacja', monthlyPriceGrossCents: 4900, isAvailable: true }],
} as unknown as PaywallErrorResponse;

beforeEach(() => {
    vi.mocked(newSubscriptionApi.previewAddOn).mockReset().mockResolvedValue({} as never);
});

afterEach(() => cleanup());

describe('w aplikacji ze sklepu', () => {
    beforeEach(() => { platform.purchasable = false; });

    it('useAddOnUnlock nie otwiera okna płatności i nie pyta o cenę', async () => {
        const { result } = renderHook(() => useAddOnUnlock());

        await act(() => result.current.openUnlockDialog('CLIENT_COMMUNICATION', 'Komunikacja'));

        expect(result.current.dialogOpen).toBe(false);
        expect(result.current.pendingKey).toBeNull();
        expect(newSubscriptionApi.previewAddOn).not.toHaveBeenCalled();
    });

    it('ModuleGateCard tylko informuje: bez ceny, „Odblokuj" i linku do pakietu', () => {
        render(card);

        expect(screen.getByRole('heading', { name: 'Automatyzacja kontaktu z klientem' })).toBeTruthy();
        expect(screen.getByText('Ten moduł nie jest włączony na Twoim koncie.')).toBeTruthy();
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.queryByText(/49,00/)).toBeNull();
        expect(screen.queryByText(/zyskasz/)).toBeNull();
        expect(screen.queryByText('Przypomnienia przed wizytą')).toBeNull();
    });

    it('402 z akcji pokazuje informację bez zakupu', async () => {
        render(<ThemeProvider theme={theme}><PaywallListener /></ThemeProvider>);

        act(() => { window.dispatchEvent(new CustomEvent('api:paywall', { detail: paywall })); });

        expect(await screen.findByText('Ten moduł nie jest włączony na Twoim koncie.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Odblokuj/ })).toBeNull();
        expect(screen.getByRole('button', { name: 'Wróć do pracy' })).toBeTruthy();
    });
});

describe('w przeglądarce - bez zmian', () => {
    beforeEach(() => { platform.purchasable = true; });

    it('useAddOnUnlock otwiera okno płatności z wyceną', async () => {
        const { result } = renderHook(() => useAddOnUnlock());

        await act(() => result.current.openUnlockDialog('CLIENT_COMMUNICATION', 'Komunikacja'));

        expect(result.current.dialogOpen).toBe(true);
        expect(result.current.pendingKey).toBe('CLIENT_COMMUNICATION');
        expect(newSubscriptionApi.previewAddOn).toHaveBeenCalledWith('CLIENT_COMMUNICATION');
    });

    it('ModuleGateCard sprzedaje moduł', () => {
        render(card);

        expect(screen.getByRole('button', { name: /Odblokuj moduł/ })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'FULL' })).toBeTruthy();
    });
});
