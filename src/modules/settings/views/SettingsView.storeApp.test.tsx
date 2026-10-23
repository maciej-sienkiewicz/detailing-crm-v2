// @vitest-environment jsdom
//
// Aplikacja ze sklepu (App Store 3.1.1, Google Play): „Pakiet" i „Kredyty SMS i AI"
// sprzedają, więc znikają z menu, a dawne linki do nich (toasty, maile, zakładki)
// otwierają pierwszą widoczną sekcję zamiast pustej strony. W przeglądarce bez zmian.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { SettingsView } from './SettingsView';

const platform = vi.hoisted(() => ({ purchasable: false }));

vi.mock('@/core/native/platform', () => ({
    canPurchaseHere: () => platform.purchasable,
    isNativeApp: () => !platform.purchasable,
}));

// Właściciel: widzi każdą sekcję, więc brak „Pakietu" bierze się tylko z platformy.
vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { permissions: null } }) }));
vi.mock('../hooks/useSmsCredits', () => ({ useSmsCreditBalance: () => ({ data: undefined }) }));
// Treść sekcji nie jest tematem - liczy się tylko, którą rama wybrała.
vi.mock('../components/MyAccountSection', () => ({ MyAccountSection: () => <p>sekcja mojego konta</p> }));
vi.mock('../components/SmsCreditSection', () => ({ SmsCreditSection: () => <p>sekcja kredytów</p> }));
vi.mock('@/modules/subscription', async importOriginal => ({
    ...(await importOriginal<typeof import('@/modules/subscription')>()),
    SubscriptionSettingsPage: () => <p>sekcja pakietu</p>,
}));

const renderAt = (path: string) => {
    const router = createMemoryRouter([{ path: '/settings', element: <SettingsView /> }], { initialEntries: [path] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <RouterProvider router={router} />
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return router;
};

const nav = () => within(screen.getByRole('navigation', { name: 'Sekcje ustawień' }));

afterEach(() => cleanup());

describe('SettingsView w aplikacji ze sklepu', () => {
    beforeEach(() => { platform.purchasable = false; });

    it('menu nie ma „Pakietu" ani „Kredytów SMS i AI"', () => {
        renderAt('/settings');

        expect(nav().queryByRole('button', { name: /Pakiet/ })).toBeNull();
        expect(nav().queryByRole('button', { name: /Kredyty SMS i AI/ })).toBeNull();
        // Reszta grupy „Konto studia" zostaje.
        expect(nav().getByRole('button', { name: /Role i uprawnienia/ })).toBeTruthy();
        expect(nav().getByRole('button', { name: /Integracje/ })).toBeTruthy();
    });

    it.each(['plan', 'credits', 'sms-credits'])('?tab=%s otwiera pierwszą widoczną sekcję', async tab => {
        renderAt(`/settings?tab=${tab}`);

        expect(await screen.findByText('sekcja mojego konta')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Moje konto' })).toBeTruthy();
        expect(screen.queryByText('sekcja pakietu')).toBeNull();
        expect(screen.queryByText('sekcja kredytów')).toBeNull();
    });
});

describe('SettingsView w przeglądarce - bez zmian', () => {
    beforeEach(() => { platform.purchasable = true; });

    it('menu ma „Pakiet" i „Kredyty SMS i AI"', () => {
        renderAt('/settings');

        expect(nav().getByRole('button', { name: /Pakiet/ })).toBeTruthy();
        expect(nav().getByRole('button', { name: /Kredyty SMS i AI/ })).toBeTruthy();
    });

    it('?tab=plan otwiera pakiet, a ?tab=credits kredyty', async () => {
        renderAt('/settings?tab=plan');
        expect(await screen.findByText('sekcja pakietu')).toBeTruthy();
        cleanup();

        renderAt('/settings?tab=credits');
        expect(await screen.findByText('sekcja kredytów')).toBeTruthy();
    });
});
