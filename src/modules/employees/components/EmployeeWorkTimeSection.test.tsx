// @vitest-environment jsdom
//
// Karta pracownika: wiersz miesiąca otwiera to samo okno karty czasu pracy, które otwiera
// wiersz w zakładce „Czas pracy". Bez przycisków decyzji w samym wierszu.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { worktimeMonthsApi, type CardDetail } from '../api/worktimeMonthsApi';
import { EmployeeWorkTimeSection } from './EmployeeWorkTimeSection';

vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { userId: 'me', permissions: null } }) }));
vi.mock('../api/employeeApi', () => ({
    employeeApi: {
        getTeamWorkTimePeriods: vi.fn().mockResolvedValue([
            {
                period: '2026-09', label: 'Wrzesień 2026', status: 'SUBMITTED', totalMinutes: 9600, totalHours: '160:00',
                entryCount: 20, overtimeMinutes: 0, overtimeHours: '0:00', returnNote: null,
            },
            {
                period: '2026-08', label: 'Sierpień 2026', status: 'APPROVED', totalMinutes: 9120, totalHours: '152:00',
                entryCount: 19, overtimeMinutes: 0, overtimeHours: '0:00', returnNote: null,
            },
        ]),
    },
}));
vi.mock('../api/worktimeMonthsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/worktimeMonthsApi')>()),
    worktimeMonthsApi: { getCard: vi.fn(), getMonth: vi.fn().mockResolvedValue(null) },
}));

const card: CardDetail = {
    userId: 'u-1', employeeId: 'e-1', name: 'Anna Nowak', status: 'SUBMITTED',
    totalMinutes: 9600, expectedMinutes: 9600, missingWorkingDays: 0, overtimeMinutes: 0, leaveWorkingDays: 0,
    submittedAt: '2026-09-30T10:00:00Z', approvedAt: null, approvedByName: null, returnNote: null,
    canDecide: true, remindedAt: null, period: '2026-09', label: 'Wrzesień 2026', days: [],
    returnedAt: null, returnedByName: null,
};

afterEach(() => cleanup());

describe('EmployeeWorkTimeSection', () => {
    it('wiersz miesiąca otwiera okno karty tego miesiąca', async () => {
        vi.mocked(worktimeMonthsApi.getCard).mockResolvedValue(card);
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <EmployeeWorkTimeSection userId="u-1" />
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>,
        );

        const september = await screen.findByRole('button', { name: /Wrzesień 2026/ });
        expect(within(september).getByText('Do zatwierdzenia')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sierpień 2026/ })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).toBeNull();

        fireEvent.click(september);
        expect(await screen.findByRole('dialog', { name: 'Anna Nowak' })).toBeInTheDocument();
        expect(worktimeMonthsApi.getCard).toHaveBeenCalledWith('2026-09', 'u-1');
    });
});
