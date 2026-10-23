// @vitest-environment jsdom
//
// Stare linki nie mogą umrzeć: zespół i rozliczenia wyszły z Ustawień do modułu
// „Pracownicy", a role zostały samodzielną sekcją. `?tab=team` krąży w mailach,
// powiadomieniach i zakładkach przeglądarki; `/team/:id` - w zakładkach kart pracowników.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { RedirectWithParams } from '@/core/components/RedirectWithParams';
import { legacyTeamRedirect } from './legacyTeamRedirect';
import { SettingsView } from './SettingsView';

vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { permissions: null } }) }));
vi.mock('../hooks/useSmsCredits', () => ({ useSmsCreditBalance: () => ({ data: undefined }) }));
// Sekcja ról nie jest tematem - liczy się tylko, że rama ją wybrała.
vi.mock('../components/RolesSection', () => ({ RolesSection: () => <p>sekcja ról</p> }));
vi.mock('../components/phone/PhoneSection', () => ({
    PhoneSection: ({ feature, openSetupOnArrival }: { feature: string; openSetupOnArrival?: boolean }) =>
        <p>sekcja telefonu {feature}{openSetupOnArrival ? ' z ustawieniami' : ''}</p>,
}));
vi.mock('../components/StudioDevicesSection', () => ({ StudioDevicesSection: () => <p>sekcja tabletów</p> }));
vi.mock('../components/MyAccountSection', () => ({ MyAccountSection: () => <p>sekcja mojego konta</p> }));
vi.mock('../components/FinanceSection', () => ({ FinanceSection: () => <p>sekcja finansów</p> }));
vi.mock('@/modules/message-templates', () => ({
    MessageTemplatesSection: ({ visitCard }: { visitCard?: unknown }) =>
        <p>sekcja wiadomości{visitCard ? ' z kartą wizyty' : ''}</p>,
}));

const renderAt = (path: string) => {
    const router = createMemoryRouter([
        { path: '/settings', element: <SettingsView /> },
        { path: '/employees', element: <p>moduł pracownicy</p> },
        { path: '/employees/worktime', element: <p>listy miesięczne</p> },
        { path: '/employees/:employeeId', element: <p>karta pracownika</p> },
        { path: '/team/:employeeId', element: <RedirectWithParams to="/employees/:employeeId" /> },
    ], { initialEntries: [path] });
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

afterEach(() => cleanup());

describe('legacyTeamRedirect', () => {
    const target = (search: string) => legacyTeamRedirect(new URLSearchParams(search));

    it('zespół i jego lista prowadzą do modułu Pracownicy', () => {
        expect(target('tab=team')).toBe('/employees');
        expect(target('tab=team&view=employees')).toBe('/employees');
    });

    it('rozliczenia prowadzą do zakładki „Listy miesięczne"', () => {
        expect(target('tab=team&view=settlements')).toBe('/employees/worktime');
    });

    it('role zostają w ustawieniach, jako samodzielna sekcja', () => {
        expect(target('tab=team&view=roles')).toBe('/settings?tab=roles');
    });

    it('inne sekcje ustawień nie są przekierowywane', () => {
        expect(target('tab=roles')).toBeNull();
        expect(target('tab=company')).toBeNull();
        expect(target('')).toBeNull();
    });
});

describe('SettingsView - przekierowania dawnych adresów', () => {
    it('?tab=team przenosi do /employees, zastępując wpis w historii', async () => {
        const router = renderAt('/settings?tab=team');
        await waitFor(() => expect(router.state.location.pathname).toBe('/employees'));
        expect(router.state.historyAction).toBe('REPLACE');
        expect(screen.getByText('moduł pracownicy')).toBeTruthy();
    });

    it('&view=settlements przenosi do /employees/worktime', async () => {
        const router = renderAt('/settings?tab=team&view=settlements');
        await waitFor(() => expect(router.state.location.pathname).toBe('/employees/worktime'));
    });

    it('&view=roles otwiera samodzielną sekcję ról', async () => {
        const router = renderAt('/settings?tab=team&view=roles');
        await waitFor(() => expect(router.state.location.search).toBe('?tab=roles'));
        expect(await screen.findByText('sekcja ról')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Role i uprawnienia' })).toBeTruthy();
    });

    it('?tab=roles otwiera sekcję ról bez przekierowania', async () => {
        const router = renderAt('/settings?tab=roles');
        expect(await screen.findByText('sekcja ról')).toBeTruthy();
        expect(router.state.location.pathname).toBe('/settings');
    });

    it('/team/:id przenosi na /employees/:id z tym samym identyfikatorem', async () => {
        const router = renderAt('/team/emp-42');
        await waitFor(() => expect(router.state.location.pathname).toBe('/employees/emp-42'));
        expect(screen.getByText('karta pracownika')).toBeTruthy();
    });
});

// „Tablety, telefon, kontakty" rozeszła się na Telefon i Tablety. Dawne adresy siedzą
// w zakładkach, w treści toastów i w linku testowego powiadomienia z backendu
// (SendTestPushHandler: `/settings?tab=mobile-devices`).
describe('SettingsView - dawna sekcja urządzeń', () => {
    it.each([
        ['/settings?tab=mobile-devices&view=notifications', 'sekcja telefonu push z ustawieniami'],
        ['/settings?tab=mobile-devices&view=contacts', 'sekcja telefonu calls z ustawieniami'],
        ['/settings?tab=mobile-devices', 'sekcja telefonu push z ustawieniami'],
        ['/settings?tab=mobile-devices&view=tablets', 'sekcja tabletów'],
        ['/settings?tab=tablets', 'sekcja tabletów'],
        ['/settings?tab=phone&view=voice', 'sekcja telefonu voice'],
        ['/settings?tab=phone&view=nieznany', 'sekcja telefonu push'],
    ])('%s otwiera właściwą sekcję', async (path, expected) => {
        renderAt(path);
        expect(await screen.findByText(expected)).toBeTruthy();
    });
});

// Przegrupowanie ustawień: sekcje, które weszły w inne, zostają adresami. Linki do nich
// siedzą w toastach („Dodaj token w Ustawieniach → KSeF”), w zakładkach i w historii.
describe('SettingsView - sekcje połączone przy przegrupowaniu', () => {
    it.each([
        ['/settings?tab=security', 'sekcja mojego konta', 'Moje konto'],
        ['/settings?tab=invoices', 'sekcja finansów', 'Finanse i KSeF'],
        ['/settings?tab=finance', 'sekcja finansów', 'Finanse i KSeF'],
        ['/settings?tab=shortcuts', 'sekcja tabletów', 'Urządzenia w studiu'],
        ['/settings?tab=visit-card', 'sekcja wiadomości z kartą wizyty', 'Wiadomości do klientów'],
        ['/settings?tab=email-templates', 'sekcja wiadomości z kartą wizyty', 'Wiadomości do klientów'],
    ])('%s otwiera sekcję, do której trafiła treść', async (path, content, heading) => {
        renderAt(path);
        expect(await screen.findByText(content)).toBeTruthy();
        expect(screen.getByRole('heading', { level: 2, name: heading })).toBeTruthy();
    });

    it('bez wybranej sekcji otwiera „Moje konto” - widzi je każdy', async () => {
        renderAt('/settings');
        expect(await screen.findByText('sekcja mojego konta')).toBeTruthy();
    });
});
