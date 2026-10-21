// @vitest-environment jsdom
//
// Kafel przychodu na Tablicy pokazuje tę samą liczbę co „Przychody" w Finansach
// za bieżący miesiąc - netto, z dokumentów przychodowych. Dawniej sumował ceny brutto
// wydanych wizyt i w październiku mówił 57 807 zł przy 138 914 zł w Finansach.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { RevenueKpiCard } from './RevenueKpiCard';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardRevenueSummary } from '../types';

vi.mock('../api/dashboardApi', () => ({ dashboardApi: { getRevenueSummary: vi.fn() } }));

const renderCard = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <RevenueKpiCard />
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

const summary = (patch: Partial<DashboardRevenueSummary> = {}): DashboardRevenueSummary => ({
    currentMonth: { netAmount: 13_891_467, grossAmount: 13_891_467, currency: 'PLN' },
    previousMonth: { netAmount: 20_000_000, grossAmount: 20_000_000, currency: 'PLN' },
    previousMonthToDate: { netAmount: 10_000_000, grossAmount: 10_000_000, currency: 'PLN' },
    deltaPercentage: 38.9,
    buckets: [],
    ...patch,
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('RevenueKpiCard', () => {
    it('pokazuje przychód netto z Finansów i mówi, że to netto', async () => {
        vi.mocked(dashboardApi.getRevenueSummary).mockResolvedValue(summary());
        renderCard();

        expect(await screen.findByText('Przychód netto w tym miesiącu')).toBeInTheDocument();
        expect(screen.getByText(/138\s914,67/)).toBeInTheDocument();
        expect(screen.getByText(/\+38,9%/)).toBeInTheDocument();
    });

    it('starszy backend bez netAmount - kwota z grossAmount, bez NaN', async () => {
        vi.mocked(dashboardApi.getRevenueSummary).mockResolvedValue(summary({
            currentMonth: { grossAmount: 5_780_700, currency: 'PLN' },
        }));
        renderCard();

        expect(await screen.findByText(/57\s807,00/)).toBeInTheDocument();
        expect(screen.queryByText(/NaN/)).toBeNull();
    });
});
