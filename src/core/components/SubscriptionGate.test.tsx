// @vitest-environment jsdom
//
// Aplikacja ze sklepu (App Store 3.1.1, Google Play): konto bez pakietu nie może tu
// niczego kupić ani dostać wskazówki, gdzie to zrobić. Zostaje informacja i wylogowanie,
// a na powitaniu - sam darmowy okres próbny. W przeglądarce wszystko jak dotąd.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import type { SubscriptionStatusResponse } from '@/modules/settings/api/subscriptionApi';
import type { AddOnDto, FeaturePlan } from '@/modules/subscription/types';
import { SubscriptionGate } from './SubscriptionGate';

const platform = vi.hoisted(() => ({ purchasable: false }));
const state = vi.hoisted(() => ({ status: undefined as unknown }));
const setAuthenticated = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn());

vi.mock('@/core/native/platform', () => ({
    canPurchaseHere: () => platform.purchasable,
    isNativeApp: () => !platform.purchasable,
}));

vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ isLoading: false, user: { role: 'OWNER' }, setAuthenticated }),
}));

vi.mock('@/modules/settings/hooks/useSubscription', () => ({
    useSubscriptionStatus: () => ({ status: state.status, isLoading: false }),
}));

vi.mock('@/modules/auth/api/authApi', () => ({ authApi: { logout } }));

const PLANS: FeaturePlan[] = [
    { key: 'BASIC', name: 'Basic', monthlyPriceGrossCents: 12300, features: [], displayOrder: 1 },
    { key: 'FULL', name: 'Full', monthlyPriceGrossCents: 24600, features: [], displayOrder: 2 },
] as FeaturePlan[];

const ADD_ONS: AddOnDto[] = [{
    key: 'CLIENT_COMMUNICATION', name: 'Komunikacja', description: 'SMS-y do klientów',
    monthlyPriceGrossCents: 4900, features: [], isAvailable: true,
}] as AddOnDto[];

vi.mock('@/modules/subscription/api/subscriptionQueries', () => ({
    useCheckout: () => ({ isPending: false, mutateAsync: vi.fn() }),
    useMyPlan: () => ({ data: undefined }),
    useFeaturePlans: () => ({ data: PLANS, isLoading: false }),
    useAddOns: () => ({ data: ADD_ONS }),
    useStartTrial: () => ({ mutateAsync: vi.fn() }),
}));

const status = (overrides: Partial<SubscriptionStatusResponse>): SubscriptionStatusResponse => ({
    status: 'ACTIVE',
    isAccessible: true,
    daysRemaining: null,
    subscriptionEndsAt: null,
    trialEndsAt: null,
    trialUsed: true,
    ...overrides,
});

const renderGate = () => render(
    <MemoryRouter initialEntries={['/calendar']}>
        <ThemeProvider theme={theme}>
            <ToastProvider>
                <Routes>
                    <Route path="/calendar" element={<SubscriptionGate><p>kalendarz</p></SubscriptionGate>} />
                    <Route path="/login" element={<p>ekran logowania</p>} />
                </Routes>
            </ToastProvider>
        </ThemeProvider>
    </MemoryRouter>,
);

beforeEach(() => {
    platform.purchasable = false;
    setAuthenticated.mockReset();
    logout.mockReset().mockResolvedValue(undefined);
});

afterEach(() => cleanup());

describe('SubscriptionGate w aplikacji ze sklepu', () => {
    it('wygasły pakiet: informacja bez przycisku zakupu i bez Przelewy24', () => {
        state.status = status({ status: 'EXPIRED', isAccessible: false });
        renderGate();

        expect(screen.getByRole('heading', { name: 'Konto jest nieaktywne' })).toBeTruthy();
        expect(screen.getByText(/Pakietem nie można zarządzać w aplikacji/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Przedłuż/ })).toBeNull();
        expect(screen.queryByText(/Przelewy24/)).toBeNull();
        expect(screen.queryByRole('link')).toBeNull();
    });

    it('z ekranu nieaktywnego konta da się wylogować', async () => {
        state.status = status({ status: 'EXPIRED', isAccessible: false });
        renderGate();

        await userEvent.click(screen.getByRole('button', { name: 'Wyloguj się' }));

        expect(logout).toHaveBeenCalledTimes(1);
        expect(setAuthenticated).toHaveBeenCalledWith(false);
        expect(await screen.findByText('ekran logowania')).toBeTruthy();
    });

    it('wylogowanie działa także, gdy serwer nie odpowie', async () => {
        logout.mockRejectedValue(new Error('offline'));
        state.status = status({ status: 'EXPIRED', isAccessible: false });
        renderGate();

        await userEvent.click(screen.getByRole('button', { name: 'Wyloguj się' }));

        await waitFor(() => expect(setAuthenticated).toHaveBeenCalledWith(false));
        expect(await screen.findByText('ekran logowania')).toBeTruthy();
    });

    it('bez pakietu i po wykorzystanej próbie: ten sam ekran, bez wyboru pakietów', () => {
        state.status = status({ status: 'NO_PLAN', isAccessible: false, trialUsed: true });
        renderGate();

        expect(screen.getByRole('heading', { name: 'Konto jest nieaktywne' })).toBeTruthy();
        expect(screen.queryByText('Basic')).toBeNull();
        expect(screen.queryByText('kalendarz')).toBeNull();
    });

    it('powitanie nowego konta proponuje tylko darmowy okres próbny', () => {
        state.status = status({ status: 'NO_PLAN', isAccessible: false, trialUsed: false });
        renderGate();

        expect(screen.getByText('Wypróbuj bezpłatnie przez 3 miesiące')).toBeTruthy();
        expect(screen.getByText(/Włącz darmowy okres próbny i zacznij pracę/)).toBeTruthy();
        expect(screen.queryByText('Basic')).toBeNull();
        expect(screen.queryByText('Full')).toBeNull();
        expect(screen.queryByText('Zbuduj własny pakiet')).toBeNull();
        expect(screen.queryByText(/Przelewy24/)).toBeNull();
        expect(screen.queryByText(/wybierz pakiet/i)).toBeNull();
    });

    it('aktywny pakiet: aplikacja bez żadnej nakładki', () => {
        state.status = status({ status: 'ACTIVE', isAccessible: true });
        renderGate();

        expect(screen.getByText('kalendarz')).toBeTruthy();
        expect(screen.queryByText('Konto jest nieaktywne')).toBeNull();
    });
});

describe('SubscriptionGate w przeglądarce - bez zmian', () => {
    beforeEach(() => { platform.purchasable = true; });

    it('wygasły pakiet: przedłużenie jak dotąd', () => {
        state.status = status({ status: 'EXPIRED', isAccessible: false });
        renderGate();

        expect(screen.getByText('Twój pakiet wygasł')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Przedłuż pakiet' })).toBeTruthy();
        expect(screen.queryByText('Konto jest nieaktywne')).toBeNull();
    });

    it('powitanie pokazuje próbę i pakiety do kupienia', () => {
        state.status = status({ status: 'NO_PLAN', isAccessible: false, trialUsed: false });
        renderGate();

        expect(screen.getByText('Wypróbuj bezpłatnie przez 3 miesiące')).toBeTruthy();
        expect(screen.getByText('Basic')).toBeTruthy();
        expect(screen.getByText(/Przelewy24/)).toBeTruthy();
    });
});
