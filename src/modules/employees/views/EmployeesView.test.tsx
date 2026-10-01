// @vitest-environment jsdom
//
// Moduł „Pracownicy" po wyjściu z Ustawień: zakładki widzi tylko ten, kto ma do nich
// prawo, zakładka „Listy miesięczne" mówi, ile list czeka, i mruga po wygenerowaniu nowej
// (jedyny sygnał, że lista nie pobrała się na dysk, tylko czeka na zatwierdzenie).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import type { AttendanceSheet } from '../api/attendanceApi';
import { EmployeesView } from './EmployeesView';

const auth = vi.hoisted(() => ({ user: { permissions: null as string[] | null } }));
vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => auth }));

const generated = { id: 'new-sheet', period: '2026-09', status: 'GENERATED' } as AttendanceSheet;

// Lista zespołu i rozliczenia nie są tu tematem - atrapa listy umie tylko otworzyć okno
// listy obecności, a atrapa okna - „wygenerować" listę.
vi.mock('../components/team/TeamList', () => ({
    TEAM_PAGE_SIZE: 20,
    TeamList: ({ onOpenAttendance }: { onOpenAttendance?: () => void }) => (
        <button type="button" onClick={() => onOpenAttendance?.()}>atrapa: lista obecności</button>
    ),
}));
vi.mock('../components/worktime/AttendanceSheetModal', () => ({
    AttendanceSheetModal: ({ onGenerated, onClose }: { onGenerated?: (sheet: AttendanceSheet) => void; onClose: () => void }) => (
        <button type="button" onClick={() => { onGenerated?.(generated); onClose(); }}>atrapa: wygeneruj listę</button>
    ),
}));
vi.mock('../components/worktime/SettlementsSection', () => ({
    SettlementsSection: ({ highlightId }: { highlightId?: string | null }) => (
        <output data-testid="settlements">{highlightId ?? 'brak'}</output>
    ),
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
vi.mock('../components/leave/AbsencesTab', () => ({ AbsencesTab: () => <p>grafik nieobecności</p> }));
vi.mock('../api/leaveRequestsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/leaveRequestsApi')>()),
    leaveRequestsApi: { list: vi.fn().mockResolvedValue({ items: [], pendingCount: 2 }) },
}));
vi.mock('../api/attendanceApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/attendanceApi')>()),
    attendanceApi: {
        listAttendanceSheets: vi.fn().mockResolvedValue([
            { id: 'a', period: '2026-08', status: 'GENERATED' },
            { id: 'b', period: '2026-07', status: 'APPROVED' },
        ]),
    },
}));

const renderAt = (path: string) => {
    const router = createMemoryRouter([
        { path: '/employees', element: <EmployeesView tab="team" /> },
        { path: '/employees/worktime', element: <EmployeesView tab="worktime" /> },
        { path: '/employees/leave-requests', element: <EmployeesView tab="leaves" /> },
        { path: '/employees/absences', element: <EmployeesView tab="absences" /> },
        { path: '/settings', element: <p>ustawienia</p> },
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
    it('właściciel widzi zespół z licznikiem i listy miesięczne z liczbą list do zatwierdzenia', async () => {
        renderAt('/employees');
        expect(await screen.findByRole('tab', { name: /^Zespół\s*4$/ })).toBeTruthy();
        expect(tab(/^Zespół/).getAttribute('aria-selected')).toBe('true');
        expect(await screen.findByRole('tab', { name: /^Listy miesięczne\s*1$/ })).toBeTruthy();
    });

    it('kliknięcie w zakładkę zmienia trasę', () => {
        const router = renderAt('/employees');
        fireEvent.click(tab(/^Listy miesięczne/));
        expect(router.state.location.pathname).toBe('/employees/worktime');
    });

    it('właściciel widzi wszystkie cztery zakładki, a przy wnioskach liczbę oczekujących', async () => {
        renderAt('/employees');
        expect(await screen.findByRole('tab', { name: /^Wnioski urlopowe\s*2$/ })).toBeTruthy();
        expect(screen.getAllByRole('tab').map(t => t.textContent?.replace(/\d+$/, '')))
            .toEqual(['Zespół', 'Wnioski urlopowe', 'Nieobecności', 'Listy miesięczne']);
    });

    it('kierownik zmiany (EMPLOYEES_LEAVES_APPROVE) widzi tylko wnioski i nieobecności', async () => {
        auth.user = { permissions: ['EMPLOYEES_LEAVES_APPROVE'] };
        renderAt('/employees/leave-requests');
        expect(await screen.findByText('kolejka wniosków')).toBeTruthy();
        expect(tab(/^Wnioski urlopowe/).getAttribute('aria-selected')).toBe('true');
        expect(tab(/^Nieobecności/)).toBeTruthy();
        expect(screen.queryByRole('tab', { name: /^Zespół/ })).toBeNull();
        expect(screen.queryByRole('tab', { name: /^Listy miesięczne/ })).toBeNull();
    });

    it('sama kadrowa rola (EMPLOYEES_MANAGE) nie widzi kolejki wniosków', () => {
        auth.user = { permissions: ['EMPLOYEES_MANAGE'] };
        renderAt('/employees/absences');
        expect(screen.getByText('grafik nieobecności')).toBeTruthy();
        expect(screen.queryByRole('tab', { name: /^Wnioski urlopowe/ })).toBeNull();
        expect(tab(/^Zespół/)).toBeTruthy();
    });

    it('po wygenerowaniu listy zakładka „Listy miesięczne" mruga, a wiersz podświetla się po wejściu', () => {
        const router = renderAt('/employees');
        expect(tab(/^Listy miesięczne/).hasAttribute('data-flash')).toBe(false);

        fireEvent.click(screen.getByRole('button', { name: 'atrapa: lista obecności' }));
        fireEvent.click(screen.getByRole('button', { name: 'atrapa: wygeneruj listę' }));

        expect(tab(/^Listy miesięczne/).getAttribute('data-flash')).toBe('true');
        expect(tab(/^Zespół/).hasAttribute('data-flash')).toBe(false);
        // Okno zamknęło się po wygenerowaniu.
        expect(screen.queryByRole('button', { name: 'atrapa: wygeneruj listę' })).toBeNull();

        fireEvent.click(tab(/^Listy miesięczne/));
        expect(router.state.location.pathname).toBe('/employees/worktime');
        expect(screen.getByTestId('settlements').textContent).toBe('new-sheet');
    });

    it('nad listą zespołu nie ma wyszukiwarki', () => {
        renderAt('/employees');
        expect(screen.queryByRole('searchbox')).toBeNull();
    });
});
