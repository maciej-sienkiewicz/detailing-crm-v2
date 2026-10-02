// @vitest-environment jsdom
//
// Moduł „Pracownicy" po wyjściu z Ustawień: zakładki widzi tylko ten, kto ma do nich
// prawo. „Czas pracy" liczy karty czekające na decyzję (GET /worktime/team/pending-count),
// a „Listy obecności" - wygenerowane listy, których nikt jeszcze nie zatwierdził.
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
import { LegacyEmployeeRedirect } from './EmployeesTabViews';

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
vi.mock('../components/worktime/SettlementsSection', () => ({
    SettlementsSection: ({ onCreateSheet }: { onCreateSheet?: () => void }) => (
        <div>
            <output data-testid="attendance-sheets">listy obecności</output>
            {onCreateSheet && <button type="button" onClick={onCreateSheet}>Wygeneruj listę</button>}
        </div>
    ),
}));
vi.mock('../components/employee-modal/EmployeeModal', () => ({
    EmployeeModal: ({ employeeId, onClose }: { employeeId: string; onClose: () => void }) => (
        <div role="dialog" aria-label={`okno pracownika ${employeeId}`}>
            <button type="button" onClick={onClose}>zamknij okno</button>
        </div>
    ),
}));
vi.mock('../components/worktime/AttendanceSheetModal', () => ({
    AttendanceSheetModal: () => <div role="dialog" aria-label="Wygeneruj listę obecności" />,
}));
vi.mock('../api/attendanceApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/attendanceApi')>()),
    attendanceApi: {
        listAttendanceSheets: vi.fn().mockResolvedValue([
            { id: 's1', status: 'GENERATED' }, { id: 's2', status: 'APPROVED' }, { id: 's3', status: 'GENERATED' },
        ]),
    },
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
        { path: '/employees/:employeeId', element: <LegacyEmployeeRedirect /> },
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
    it('właściciel widzi liczniki: zespół, karty do decyzji przy „Czas pracy", niezatwierdzone listy przy „Listy obecności"', async () => {
        renderAt('/employees');
        expect(await screen.findByRole('tab', { name: /^Zespół\s*4$/ })).toBeTruthy();
        expect(tab(/^Zespół/).getAttribute('aria-selected')).toBe('true');
        expect(await screen.findByRole('tab', { name: /^Czas pracy\s*2$/ })).toBeTruthy();
        expect(await screen.findByRole('tab', { name: /^Listy obecności\s*2$/ })).toBeTruthy();
    });

    it('bez prawa do kadr liczniki czasu pracy i list obecności nie są pobierane', async () => {
        auth.user = { permissions: ['EMPLOYEES_LEAVES_APPROVE'] };
        const { worktimeMonthsApi } = await import('../api/worktimeMonthsApi');
        vi.mocked(worktimeMonthsApi.pendingCount).mockClear();
        const { attendanceApi } = await import('../api/attendanceApi');
        vi.mocked(attendanceApi.listAttendanceSheets).mockClear();
        renderAt('/employees/leave-requests');
        expect(await screen.findByText('grafik nieobecności')).toBeTruthy();
        expect(worktimeMonthsApi.pendingCount).not.toHaveBeenCalled();
        expect(attendanceApi.listAttendanceSheets).not.toHaveBeenCalled();
    });

    it('kliknięcie w zakładkę zmienia trasę', () => {
        const router = renderAt('/employees');
        fireEvent.click(tab(/^Czas pracy/));
        expect(router.state.location.pathname).toBe('/employees/worktime');
    });

    it('właściciel widzi cztery zakładki, a przy wnioskach liczbę oczekujących', async () => {
        renderAt('/employees');
        expect(await screen.findByRole('tab', { name: /^Wnioski urlopowe\s*2$/ })).toBeTruthy();
        expect(screen.getAllByRole('tab').map(t => t.textContent?.replace(/\d+$/, '')))
            .toEqual(['Zespół', 'Wnioski urlopowe', 'Czas pracy', 'Listy obecności']);
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
        expect(screen.queryByRole('tab', { name: /^Czas pracy/ })).toBeNull();
        expect(screen.queryByRole('tab', { name: /^Listy obecności/ })).toBeNull();
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

        fireEvent.click(tab(/^Czas pracy/));
        expect(screen.getByTestId('month-view')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Pracownicy' })).toBe(heading);
    });

    it('„Czas pracy" zostaje pod /employees/worktime, „Listy obecności" pod /employees/attendance-sheets', async () => {
        const router = renderAt('/employees');
        fireEvent.click(tab(/^Czas pracy/));
        expect(router.state.location.pathname).toBe('/employees/worktime');
        fireEvent.click(tab(/^Listy obecności/));
        expect(router.state.location.pathname).toBe('/employees/attendance-sheets');
        expect(await screen.findByTestId('attendance-sheets')).toBeTruthy();
    });

    it('„Listy obecności": „Wygeneruj listę" otwiera okno z wyborem pracowników', async () => {
        renderAt('/employees/attendance-sheets');
        expect(screen.queryByRole('dialog')).toBeNull();
        fireEvent.click(await screen.findByRole('button', { name: 'Wygeneruj listę' }));
        expect(screen.getByRole('dialog', { name: 'Wygeneruj listę obecności' })).toBeTruthy();
    });

    it('/employees bez prawa do zespołu przekierowuje na pierwszą dostępną zakładkę', async () => {
        auth.user = { permissions: ['EMPLOYEES_LEAVES_APPROVE'] };
        const router = renderAt('/employees');
        expect(await screen.findByText('kolejka wniosków')).toBeTruthy();
        expect(router.state.location.pathname).toBe('/employees/leave-requests');
    });

    it('?person= otwiera okno pracownika nad listą „Zespół", a zamknięcie zdejmuje parametr', async () => {
        const router = renderAt('/employees?person=emp-1');
        expect(await screen.findByRole('dialog', { name: 'okno pracownika emp-1' })).toBeTruthy();
        expect(screen.getByText('atrapa: zespół')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'zamknij okno' }));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(router.state.location.search).toBe('');
    });

    it('dawny adres strony pracownika /employees/:id otwiera jego okno', async () => {
        const router = renderAt('/employees/emp-1');
        expect(await screen.findByRole('dialog', { name: 'okno pracownika emp-1' })).toBeTruthy();
        expect(router.state.location.pathname).toBe('/employees');
        expect(router.state.location.search).toBe('?person=emp-1');
        // Statyczne zakładki nie wpadają w dawną trasę z parametrem.
        await act(() => router.navigate('/employees/leave-requests'));
        expect(screen.getByText('grafik nieobecności')).toBeTruthy();
    });
});
