// @vitest-environment jsdom
//
// Po wygenerowaniu listy obecności zakładka „Rozliczenia" ma wyraźnie mrugać - to jedyny
// sygnał, że lista nie pobrała się na dysk, tylko czeka tam na zatwierdzenie.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import type { AttendanceSheet } from '../api/attendanceApi';
import { TeamAndRolesSection } from './TeamAndRolesSection';

const generated = { id: 'new-sheet', period: '2026-09', status: 'GENERATED' } as AttendanceSheet;

// Lista pracowników i role nie są tu tematem - atrapa listy umie tylko „wygenerować" listę.
vi.mock('./TeamSection', () => ({
    TEAM_PAGE_SIZE: 20,
    TeamSection: ({ onAttendanceSheetGenerated }: { onAttendanceSheetGenerated?: (sheet: AttendanceSheet) => void }) => (
        <button type="button" onClick={() => onAttendanceSheetGenerated?.(generated)}>atrapa: wygeneruj listę</button>
    ),
}));
vi.mock('./RolesSection', () => ({ RolesSection: () => null }));
vi.mock('../hooks/useTeam', () => ({ useEmployees: () => ({ pagination: { totalItems: 4 } }) }));
vi.mock('../hooks/useRoles', () => ({ useRoles: () => ({ roles: [] }) }));
vi.mock('../api/attendanceApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/attendanceApi')>()),
    attendanceApi: {
        listAttendanceSheets: vi.fn().mockResolvedValue([
            { id: 'a', period: '2026-08', status: 'GENERATED' },
            { id: 'b', period: '2026-07', status: 'APPROVED' },
        ]),
    },
}));

const renderSection = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <TeamAndRolesSection subView="employees" onSubViewChange={vi.fn()} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

afterEach(() => cleanup());

describe('TeamAndRolesSection - zakładka Rozliczenia', () => {
    it('licznik na zakładce to rozliczenia do zatwierdzenia', async () => {
        renderSection();
        expect(await screen.findByRole('tab', { name: /Rozliczenia\s*1/ })).toBeTruthy();
    });

    it('po wygenerowaniu listy zakładka zaczyna mrugać', async () => {
        renderSection();
        const settlements = () => screen.getByRole('tab', { name: /Rozliczenia/ });
        expect(settlements().hasAttribute('data-flash')).toBe(false);

        fireEvent.click(screen.getByRole('button', { name: 'atrapa: wygeneruj listę' }));

        expect(settlements().getAttribute('data-flash')).toBe('true');
        expect(screen.getByRole('tab', { name: /Pracownicy/ }).hasAttribute('data-flash')).toBe(false);
    });
});
