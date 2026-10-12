// @vitest-environment jsdom
//
// Panel „Szczegóły okresu": kwota z różnicą do zwykłego okresu, na co poszły pieniądze
// i wizyty od największej - liczbami, bez akapitów.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { PeriodDetail, StatsDataPoint } from '../types';
import { PeriodDetailDrawer } from './PeriodDetailDrawer';

const fetchPeriodDetail = vi.fn();
vi.mock('../api/periodDetailApi', () => ({
    fetchPeriodDetail: (...args: unknown[]) => fetchPeriodDetail(...args),
}));

const categories = [
    { categoryId: 'cer', categoryName: 'Powłoki ceramiczne', description: null, color: '#8B5CF6', totals: { orderCount: 0, totalRevenueGross: 0 }, services: [] },
    { categoryId: 'myc', categoryName: 'Mycie', description: null, color: '#10B981', totals: { orderCount: 0, totalRevenueGross: 0 }, services: [] },
];

// Cztery zwykłe tygodnie po 7 wizyt i ok. 13 tys. zł, potem tydzień 5-11 października.
const series: StatsDataPoint[] = [
    { period: '2026-W37', orderCount: 7, totalRevenueGross: 1300000 },
    { period: '2026-W38', orderCount: 7, totalRevenueGross: 1300000 },
    { period: '2026-W39', orderCount: 7, totalRevenueGross: 1300000 },
    { period: '2026-W40', orderCount: 7, totalRevenueGross: 1300000 },
    { period: '2026-W41', orderCount: 2, totalRevenueGross: 1000000 },
];

const detail: PeriodDetail = {
    period: '2026-W41',
    granularity: 'WEEKLY',
    orderCount: 2,
    totalRevenueGross: 1000000,
    totalRevenueGrossAll: 1000000,
    categoryName: null,
    visits: [
        {
            visitId: 'v-small', visitDate: '6 paź 2026', clientName: 'Robert Mazur', vehicleInfo: 'Ford Kuga (2020)', totalRevenueGross: 100000, totalRevenueGrossAll: 100000,
            services: [{ serviceId: 's1', serviceName: 'Mycie detailingowe', priceGross: 100000, categoryId: 'myc' }],
        },
        {
            visitId: 'v-big', visitDate: '10 paź 2026', clientName: 'Tomasz Lewandowski', vehicleInfo: 'Porsche Cayenne (2023)', totalRevenueGross: 900000, totalRevenueGrossAll: 900000,
            services: [{ serviceId: 's2', serviceName: 'Powłoka ceramiczna 5 lat', priceGross: 900000, categoryId: 'cer' }],
        },
    ],
};

function renderDrawer(overrides: Partial<Parameters<typeof PeriodDetailDrawer>[0]> = {}) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <ThemeProvider theme={theme}>
            <QueryClientProvider client={client}>
                <MemoryRouter>
                    <PeriodDetailDrawer
                        period="2026-W41"
                        granularity="WEEKLY"
                        startDate="2026-09-07"
                        endDate="2026-10-11"
                        series={series}
                        categories={categories}
                        onClose={() => {}}
                        {...overrides}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        </ThemeProvider>,
    );
}

describe('PeriodDetailDrawer', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-12T12:00:00+02:00'));
        fetchPeriodDetail.mockReset();
    });
    afterEach(() => vi.useRealTimers());

    it('tytuł mówi, jakie to dni, a kwota z różnicą do zwykłego tygodnia stoi od razu', () => {
        fetchPeriodDetail.mockReturnValue(new Promise(() => {}));
        renderDrawer();

        expect(screen.getByRole('heading', { name: 'Tydzień 5–11 października 2026' })).toBeTruthy();
        expect(screen.queryByText('2026-W41')).toBeNull();
        const result = screen.getByLabelText('Wynik okresu');
        expect(within(result).getByText('10 000 zł')).toBeTruthy();
        expect(within(result).getByText('\u22123 000 zł niż zwykle')).toBeTruthy();
        expect(within(result).getByText('2 wizyty, zwykle 13 000 zł z 7 wizyt')).toBeTruthy();
    });

    it('po wczytaniu: na co poszły pieniądze i wizyty od największej z przejściem do wizyty', async () => {
        fetchPeriodDetail.mockResolvedValue(detail);
        renderDrawer();

        const links = await screen.findAllByRole('link');
        expect(fetchPeriodDetail).toHaveBeenCalledWith('2026-W41', 'WEEKLY', { categoryId: undefined, from: '2026-09-07', to: '2026-10-11' });
        expect(links.map(a => a.getAttribute('href'))).toEqual(['/visits/v-big', '/visits/v-small']);
        expect(screen.getByText('Powłoki ceramiczne')).toBeTruthy();
        expect(screen.getByText('9 000 zł', { selector: 'li > span' })).toBeTruthy();
    });

    it('okres, który trwa, nie dostaje porównania - niepełny tydzień zawsze wypadałby gorzej', () => {
        fetchPeriodDetail.mockReturnValue(new Promise(() => {}));
        renderDrawer({ endDate: '2026-10-12', series: [...series, { period: '2026-W42', orderCount: 1, totalRevenueGross: 50000 }], period: '2026-W42' });

        expect(screen.getByText('Tydzień trwa, dane do 12 października')).toBeTruthy();
        expect(screen.queryByText(/niż zwykle/)).toBeNull();
    });

    it('filtr kategorii: plakietka w nagłówku, w składzie tylko usługi kategorii', async () => {
        fetchPeriodDetail.mockResolvedValue({
            ...detail,
            categoryName: 'Powłoki ceramiczne',
            visits: [{
                ...detail.visits[1],
                totalRevenueGrossAll: 950000,
                services: [
                    { serviceId: 's2', serviceName: 'Powłoka ceramiczna 5 lat', priceGross: 900000, categoryId: 'cer', inCategory: true },
                    { serviceId: 's1', serviceName: 'Mycie detailingowe', priceGross: 50000, categoryId: 'myc', inCategory: false },
                ],
            }],
        });
        renderDrawer({ categoryId: 'cer', categoryName: 'Powłoki ceramiczne' });

        expect(screen.getByText('Kategoria: Powłoki ceramiczne')).toBeTruthy();
        await screen.findByText('Powłoka ceramiczna 5 lat');
        expect(screen.queryByText('Mycie detailingowe')).toBeNull();
    });

    it('błąd wczytania wizyt zostawia kwotę i daje ponowić', async () => {
        fetchPeriodDetail.mockRejectedValue(new Error('500'));
        renderDrawer();

        await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Nie udało się wczytać wizyt'));
        expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeTruthy();
        expect(screen.getByLabelText('Wynik okresu')).toBeTruthy();
    });
});
