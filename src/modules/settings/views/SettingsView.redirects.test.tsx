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

const renderAt = (path: string) => {
    const router = createMemoryRouter([
        { path: '/settings', element: <SettingsView /> },
        { path: '/employees', element: <p>moduł pracownicy</p> },
        { path: '/employees/worktime', element: <p>czas pracy</p> },
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

    it('rozliczenia prowadzą do zakładki „Czas pracy"', () => {
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
