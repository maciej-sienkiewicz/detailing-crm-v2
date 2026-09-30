// @vitest-environment jsdom
//
// Moduł „Pracownicy" po wyjściu z Ustawień: zakładki widzi tylko ten, kto ma do nich
// prawo, zakładka „Czas pracy" mówi, ile list czeka, i mruga po wygenerowaniu nowej
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
    TeamList: ({ onOpenAttendance, search }: { onOpenAttendance?: () => void; search?: string }) => (
        <>
            <button type="button" onClick={() => onOpenAttendance?.()}>atrapa: lista obecności</button>
            <output data-testid="search">{search}</output>
        </>
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
    it('właściciel widzi zespół z licznikiem i czas pracy z liczbą list do zatwierdzenia', async () => {
        renderAt('/employees');
        expect(await screen.findByRole('tab', { name: /^Zespół\s*4$/ })).toBeTruthy();
        expect(tab(/^Zespół/).getAttribute('aria-selected')).toBe('true');
        expect(await screen.findByRole('tab', { name: /^Czas pracy\s*1$/ })).toBeTruthy();
    });

    it('kliknięcie w zakładkę zmienia trasę', () => {
        const router = renderAt('/employees');
        fireEvent.click(tab(/^Czas pracy/));
        expect(router.state.location.pathname).toBe('/employees/worktime');
    });

    it('bez EMPLOYEES_MANAGE zakładek kadrowych nie ma', () => {
        auth.user = { permissions: ['EMPLOYEES_LEAVES_APPROVE'] };
        renderAt('/employees');
        expect(screen.queryByRole('tab', { name: /^Zespół/ })).toBeNull();
        expect(screen.queryByRole('tab', { name: /^Czas pracy/ })).toBeNull();
    });

    it('po wygenerowaniu listy „Czas pracy" mruga, a wiersz podświetla się po wejściu', () => {
        const router = renderAt('/employees');
        expect(tab(/^Czas pracy/).hasAttribute('data-flash')).toBe(false);

        fireEvent.click(screen.getByRole('button', { name: 'atrapa: lista obecności' }));
        fireEvent.click(screen.getByRole('button', { name: 'atrapa: wygeneruj listę' }));

        expect(tab(/^Czas pracy/).getAttribute('data-flash')).toBe('true');
        expect(tab(/^Zespół/).hasAttribute('data-flash')).toBe(false);
        // Okno zamknęło się po wygenerowaniu.
        expect(screen.queryByRole('button', { name: 'atrapa: wygeneruj listę' })).toBeNull();

        fireEvent.click(tab(/^Czas pracy/));
        expect(router.state.location.pathname).toBe('/employees/worktime');
        expect(screen.getByTestId('settlements').textContent).toBe('new-sheet');
    });

    it('wyszukiwarka stoi nad listą zespołu i filtruje ją', () => {
        renderAt('/employees');
        fireEvent.change(screen.getByRole('searchbox', { name: /Szukaj osoby/ }), { target: { value: 'Nowak' } });
        expect(screen.getByTestId('search').textContent).toBe('Nowak');
    });

    it('w zakładce „Czas pracy" wyszukiwarki nie ma', () => {
        renderAt('/employees/worktime');
        expect(screen.queryByRole('searchbox')).toBeNull();
        expect(screen.getByTestId('settlements')).toBeTruthy();
    });
});
