// @vitest-environment jsdom
//
// Karta pracownika: decyzja o karcie czasu pracy zapada w tym samym oknie co w „Listach
// miesięcznych". Wiersz okresu nie ma już własnych „✓" i „↶" - otwiera okno przeglądu.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { worktimeMonthsApi, type CardDetail } from '../api/worktimeMonthsApi';
import { EmployeeWorkTimeSection } from './EmployeeWorkTimeSection';

vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { userId: 'me' } }) }));
vi.mock('../api/employeeApi', () => ({
    employeeApi: {
        getTeamWorkTimePeriods: vi.fn().mockResolvedValue([
            {
                period: '2026-09', label: 'Wrzesień 2026', status: 'SUBMITTED', totalMinutes: 9600, totalHours: '160:00',
                entryCount: 20, overtimeMinutes: 0, overtimeHours: '0:00', returnNote: null,
            },
        ]),
    },
}));
vi.mock('../api/worktimeMonthsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/worktimeMonthsApi')>()),
    worktimeMonthsApi: { getMonth: vi.fn(), getCard: vi.fn(), approveCard: vi.fn(), returnCard: vi.fn(), remind: vi.fn() },
}));

const card: CardDetail = {
    userId: 'u-1', employeeId: 'e-1', name: 'Anna Nowak', status: 'SUBMITTED',
    totalMinutes: 9600, expectedMinutes: 10080, missingWorkingDays: 1, overtimeMinutes: 0, leaveWorkingDays: 0,
    submittedAt: '2026-09-30T10:00:00Z', approvedAt: null, approvedByName: null, returnNote: null,
    canDecide: true, remindedAt: null, period: '2026-09', label: 'Wrzesień 2026', returnedAt: null, returnedByName: null,
    days: [{ date: '2026-09-01', minutes: 480, note: 'Mycie floty', isWorkingDay: true, holidayName: null, leave: null, missing: false }],
};

afterEach(() => cleanup());

describe('EmployeeWorkTimeSection', () => {
    it('wiersz okresu otwiera okno przeglądu karty, bez akcji w samym wierszu', async () => {
        vi.mocked(worktimeMonthsApi.getCard).mockResolvedValue(card);
        vi.mocked(worktimeMonthsApi.getMonth).mockResolvedValue({
            period: '2026-09', label: 'Wrzesień 2026', workingDays: 21, stage: 'REVIEWING',
            counts: { total: 1, notSubmitted: 0, submitted: 1, returned: 0, approved: 0 },
            employees: [card], sheet: null, sheetHistory: [],
        });
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <EmployeeWorkTimeSection userId="u-1" />
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>,
        );

        const open = await screen.findByRole('button', { name: 'Otwórz kartę: Wrzesień 2026, Do zatwierdzenia' });
        expect(screen.queryByTitle('Zatwierdź kartę')).toBeNull();
        expect(screen.queryByTitle('Zwróć do poprawy')).toBeNull();

        fireEvent.click(open);
        const dialog = await screen.findByRole('dialog', { name: 'Anna Nowak' });
        expect(await within(dialog).findByText('Mycie floty')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: /Zatwierdź kartę/ })).toBeInTheDocument();
        // Z karty pracownika nie przechodzi się do innych osób.
        expect(within(dialog).queryByRole('button', { name: 'Następna osoba' })).toBeNull();
    });
});
