// @vitest-environment jsdom
//
// Karta pracownika: wiersz miesiąca to zwykły link do strony karty czasu pracy - tej
// samej, do której prowadzi lista miesiąca. Bez okna i bez przycisków w wierszu.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { EmployeeWorkTimeSection } from './EmployeeWorkTimeSection';

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

afterEach(() => cleanup());

describe('EmployeeWorkTimeSection', () => {
    it('wiersz miesiąca jest linkiem do strony karty, bez akcji i bez okna', async () => {
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider theme={theme}>
                    <MemoryRouter>
                        <EmployeeWorkTimeSection userId="u-1" />
                    </MemoryRouter>
                </ThemeProvider>
            </QueryClientProvider>,
        );

        const september = await screen.findByRole('link', { name: /Wrzesień 2026/ });
        expect(september).toHaveAttribute('href', '/employees/worktime/2026-09/u-1');
        expect(within(september).getByText('Do zatwierdzenia')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Sierpień 2026/ })).toHaveAttribute('href', '/employees/worktime/2026-08/u-1');
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
