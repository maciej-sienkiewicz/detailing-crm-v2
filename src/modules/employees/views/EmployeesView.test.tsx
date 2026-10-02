// @vitest-environment jsdom
//
// Moduł „Pracownicy" po wyjściu z Ustawień: zakładki widzi tylko ten, kto ma do nich
// prawo, a zakładka „Listy miesięczne" mówi, ile czeka na menedżera: karty do decyzji
// plus listy obecności do podpisu (GET /worktime/team/pending-count).
// Zakładki są trasami-dziećmi jednej ramy: zmiana zakładki nie montuje nagłówka od nowa.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { EmployeesView } from './EmployeesView';
import { employeesTabRoutes } from '../employeesRoutes';

const auth = vi.hoisted(() => ({ user: { permissions: null as string[] | null } }));
vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => auth }));

// Lista zespołu i widok miesiąca nie są tu tematem - same atrapy.
vi.mock('../components/team/TeamList', () => ({
    TEAM_PAGE_SIZE: 20,
    TeamList: () => <p>atrapa: zespół</p>,
}));
vi.mock('../components/worktime/MonthView', () => ({
    MonthView: () => <output data-testid="month-view">listy miesięczne</output>,
}));
vi.mock('../api/employeeApi', () => ({
    employeeApi: {
        listEmployees: vi.fn().mockResolvedValue({
            items: [],
            pagination: { currentPage: 1, totalPages: 1, totalItems: 4, itemsPerPage: 20 },
        }),
    },
}));
vi.mock('../components/leave/LeaveRequestsTab', () => ({ LeaveRequestsTab: () => <p>kolejka wniosków</p> }));
vi.mock('../components/leave/AbsencesSection', () => ({ AbsencesSection: () => <p>grafik nieobecności</p> }));
vi.mock('../api/leaveRequestsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/leaveRequestsApi')>()),
    leaveRequestsApi: { list: vi.fn().mockResolvedValue({ items: [], pendingCount: 2 }) },
}));
vi.mock('../api/worktimeMonthsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/worktimeMonthsApi')>()),
    worktimeMonthsApi: {
        pendingCount: vi.fn().mockResolvedValue({ submittedCards: 2, sheetsToSign: 1 }),
    },
}));

const renderAt = (path: string) => {
    // Ta sama konfiguracja tras co w aplikacji: rama z zakładkami jako dziećmi.
    const router = createMemoryRouter([
        { path: '/employees', element: <EmployeesView />, children: employeesTabRoutes },
        { path: '/employees/:employeeId', element: <p>karta pracownika</p> },
        { path: '/settings', element: <p>ustawienia</p> },
        { path: '*', element: <p>strona startowa</p> },
    ], { initialEntries: [path] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <RouterProvider router={router} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return router;
};

const tab = (name: RegExp) => screen.getByRole('tab', { name });

beforeEach(() => { auth.user = { permissions: null }; });
afterEach(() => cleanup());

describe('EmployeesView - zakładki', () => {
    it('właściciel widzi zespół z licznikiem, a przy listach miesięcznych karty do decyzji plus listy do podpisu', async () => {
        renderAt('/employees');
        expect(await screen.findByRole('tab', { name: /^Zespół\s*4$/ })).toBeTruthy();
        expect(tab(/^Zespół/).getAttribute('aria-selected')).toBe('true');
        expect(await screen.findByRole('tab', { name: /^Listy miesięczne\s*3$/ })).toBeTruthy();
    });

    it('bez prawa do kadr licznik list miesięcznych nie jest pobierany', async () => {
        auth.user = { permissions: ['EMPLOYEES_LEAVES_APPROVE'] };
        const { worktimeMonthsApi } = await import('../api/worktimeMonthsApi');
        vi.mocked(worktimeMonthsApi.pendingCount).mockClear();
        renderAt('/employees/leave-requests');
        expect(await screen.findByText('grafik nieobecności')).toBeTruthy();
        expect(worktimeMonthsApi.pendingCount).not.toHaveBeenCalled();
    });

    it('kliknięcie w zakładkę zmienia trasę', () => {
        const router = renderAt('/employees');
        fireEvent.click(tab(/^Listy miesięczne/));
        expect(router.state.location.pathname).toBe('/employees/worktime');
    });

    it('właściciel widzi trzy zakładki, a przy wnioskach liczbę oczekujących', async () => {
        renderAt('/employees');
        expect(await screen.findByRole('tab', { name: /^Wnioski urlopowe\s*2$/ })).toBeTruthy();
        expect(screen.getAllByRole('tab').map(t => t.textContent?.replace(/\d+$/, '')))
            .toEqual(['Zespół', 'Wnioski urlopowe', 'Listy miesięczne']);
    });

    it('„Wnioski urlopowe": kolejka wniosków, a pod nią grafik nieobecności', async () => {
        renderAt('/employees/leave-requests');
        const queue = await screen.findByText('kolejka wniosków');
        const grid = screen.getByText('grafik nieobecności');
        // Grafik stoi POD kolejką.
        expect(queue.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('dawny adres zakładki „Nieobecności" prowadzi do wniosków', async () => {
        const router = renderAt('/employees/absences');
        expect(await screen.findByText('grafik nieobecności')).toBeTruthy();
        expect(router.state.location.pathname).toBe('/employees/leave-requests');
    });

    it('kierownik zmiany (EMPLOYEES_LEAVES_APPROVE) widzi tylko wnioski, z kolejką i grafikiem', async () => {
        auth.user = { permissions: ['EMPLOYEES_LEAVES_APPROVE'] };
        renderAt('/employees/leave-requests');
        expect(await screen.findByText('kolejka wniosków')).toBeTruthy();
        expect(screen.getByText('grafik nieobecności')).toBeTruthy();
        expect(tab(/^Wnioski urlopowe/).getAttribute('aria-selected')).toBe('true');
        expect(screen.queryByRole('tab', { name: /^Zespół/ })).toBeNull();
        expect(screen.queryByRole('tab', { name: /^Listy miesięczne/ })).toBeNull();
    });

    it('sama kadrowa rola (EMPLOYEES_MANAGE) widzi grafik nieobecności bez kolejki wniosków', () => {
        auth.user = { permissions: ['EMPLOYEES_MANAGE'] };
        renderAt('/employees/leave-requests');
        expect(screen.getByText('grafik nieobecności')).toBeTruthy();
        expect(screen.queryByText('kolejka wniosków')).toBeNull();
        expect(tab(/^Wnioski urlopowe/)).toBeTruthy();
        expect(tab(/^Zespół/)).toBeTruthy();
    });

    it('w zakładce „Zespół" nie ma wyszukiwarki', () => {
        renderAt('/employees');
        expect(screen.getByText('atrapa: zespół')).toBeTruthy();
        expect(screen.queryByRole('searchbox')).toBeNull();
        expect(screen.queryByPlaceholderText(/Szukaj/)).toBeNull();
    });

    it('zmiana zakładki wymienia tylko treść - nagłówek i pasek zostają tymi samymi węzłami', async () => {
        const router = renderAt('/employees/leave-requests');
        expect(await screen.findByText('kolejka wniosków')).toBeTruthy();
        const heading = screen.getByRole('heading', { name: 'Pracownicy' });
        const tabList = screen.getByRole('tablist');

        fireEvent.click(tab(/^Zespół/));
        expect(router.state.location.pathname).toBe('/employees');
        expect(await screen.findByText('atrapa: zespół')).toBeTruthy();
        expect(screen.queryByText('kolejka wniosków')).toBeNull();
        // Ten sam węzeł, nie kopia: rama nie została odmontowana.
        expect(screen.getByRole('heading', { name: 'Pracownicy' })).toBe(heading);
        expect(screen.getByRole('tablist')).toBe(tabList);
        expect(heading.isConnected).toBe(true);

        fireEvent.click(tab(/^Listy miesięczne/));
        expect(screen.getByTestId('month-view')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Pracownicy' })).toBe(heading);
    });

    it('zakładka „Listy miesięczne" zostaje pod /employees/worktime', () => {
        const router = renderAt('/employees');
        fireEvent.click(tab(/^Listy miesięczne/));
        expect(router.state.location.pathname).toBe('/employees/worktime');
    });

    it('/employees bez prawa do zespołu przekierowuje na pierwszą dostępną zakładkę', async () => {
        auth.user = { permissions: ['EMPLOYEES_LEAVES_APPROVE'] };
        const router = renderAt('/employees');
        expect(await screen.findByText('kolejka wniosków')).toBeTruthy();
        expect(router.state.location.pathname).toBe('/employees/leave-requests');
    });

    it('karta pracownika /employees/:id nie wpada w zakładki, a zakładki - w kartę', async () => {
        const router = renderAt('/employees/emp-1');
        expect(screen.getByText('karta pracownika')).toBeTruthy();
        expect(screen.queryByRole('tablist')).toBeNull();
        await act(() => router.navigate('/employees/leave-requests'));
        expect(screen.queryByText('karta pracownika')).toBeNull();
        expect(screen.getByText('grafik nieobecności')).toBeTruthy();
    });
});
