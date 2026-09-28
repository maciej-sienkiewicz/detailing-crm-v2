// @vitest-environment jsdom
//
// Statystyki → „Raporty": każdy okres od założenia konta, trwający na górze bez PDF-u
// (kręci się wskaźnik), długość i porównanie w adresie, kwoty co do grosza.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { saveBlobAsFile } from '@/common/utils/blobFile';
import {
    ownerReportApi,
    type ReportArchive,
    type ReportArchiveRow,
    type ReportComparison,
    type ReportLength,
} from '../api/ownerReportApi';
import { ReportsView, REPORTS_PAGE } from './ReportsView';

vi.mock('../api/ownerReportApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/ownerReportApi')>()),
    ownerReportApi: {
        getArchive: vi.fn(),
        listPeriods: vi.fn(),
        downloadPdf: vi.fn(),
        getNotification: vi.fn(),
        updateNotification: vi.fn(),
    },
}));

vi.mock('@/common/utils/blobFile', async importOriginal => ({
    ...(await importOriginal<typeof import('@/common/utils/blobFile')>()),
    saveBlobAsFile: vi.fn(),
}));

const api = vi.mocked(ownerReportApi);

const row = (patch: Partial<ReportArchiveRow>): ReportArchiveRow => ({
    from: '2026-09-21', to: '2026-09-27', label: '21.09–27.09.2026', inProgress: false, availableOn: '2026-09-28',
    closedVisits: 12, salesGrossCents: 1_900_000, baselineClosedVisits: 10, baselineSalesGrossCents: 1_700_000,
    closedVisitsChange: '+2', salesGrossChange: '+12%', ...patch,
});

const current = row({
    from: '2026-09-28', to: '2026-10-04', label: '28.09–04.10.2026', inProgress: true, availableOn: '2026-10-05',
    closedVisits: 3, salesGrossCents: 190_000, baselineClosedVisits: null, baselineSalesGrossCents: null,
    closedVisitsChange: null, salesGrossChange: null,
});

const archive = (length: ReportLength, comparison: ReportComparison, rows: ReportArchiveRow[]): ReportArchive =>
    ({ length, comparison, since: '2026-09-03', rows });

function LocationProbe() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderView(url = '/statistics/reports') {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <MemoryRouter initialEntries={[url]}>
                        <Routes>
                            <Route path="*" element={<><ReportsView /><LocationProbe /></>} />
                        </Routes>
                    </MemoryRouter>
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    api.getArchive.mockImplementation(async (length, comparison) =>
        archive(length, comparison, [current, row({}), row({ from: '2026-09-14', to: '2026-09-20', label: '14.09–20.09.2026' })]));
    api.downloadPdf.mockResolvedValue(new Blob(['%PDF']));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ReportsView', () => {
    it('trwający okres na górze: wskaźnik i data gotowości zamiast przycisku PDF', async () => {
        renderView();

        const rows = await screen.findAllByRole('row');
        const top = rows[1];
        expect(within(top).getByText('28.09–04.10.2026')).toBeTruthy();
        expect(within(top).getByText('Trwa')).toBeTruthy();
        expect(within(top).getByRole('status', { name: /Okres trwa, raport będzie gotowy 05\.10\.2026/ })).toBeTruthy();
        expect(within(top).queryByRole('button')).toBeNull();
        expect(within(top).getAllByText('do dziś')).toHaveLength(2);

        expect(within(rows[2]).getByRole('button', { name: 'Pobierz raport PDF za 21.09–27.09.2026' })).toBeTruthy();
        expect(screen.getByText('Od 03.09.2026, dnia założenia konta')).toBeTruthy();
    });

    it('kwoty co do grosza i porównanie z napisem z backendu, bez kropek', async () => {
        renderView();

        const lastWeek = (await screen.findAllByRole('row'))[2];
        expect(lastWeek.textContent).toMatch(/19\s000,00\s*zł/);
        expect(within(lastWeek).getByText('+12%')).toBeTruthy();
        expect(lastWeek.textContent).toMatch(/poprzednio 17\s000,00\s*zł/);
        expect(within(lastWeek).getByText('poprzednio 10')).toBeTruthy();
        expect(document.body.textContent).not.toContain('·');
    });

    it('długość i porównanie z adresu, zmiana zapisuje się w adresie', async () => {
        renderView('/statistics/reports?okres=miesiac&porownanie=mediana');

        await waitFor(() => expect(api.getArchive).toHaveBeenCalledWith('MONTH', 'MEDIAN'));
        expect(await screen.findAllByText(/^mediana /)).not.toHaveLength(0);

        fireEvent.click(screen.getByRole('button', { name: '2 tygodnie' }));
        fireEvent.click(screen.getByRole('button', { name: 'Poprzedni okres' }));

        await waitFor(() => expect(api.getArchive).toHaveBeenLastCalledWith('TWO_WEEKS', 'PREVIOUS'));
        expect(screen.getByTestId('location').textContent).toBe('/statistics/reports?okres=2-tygodnie&porownanie=poprzedni');
    });

    it('PDF za pełny okres z wybranym porównaniem', async () => {
        renderView('/statistics/reports?porownanie=mediana');

        fireEvent.click(await screen.findByRole('button', { name: 'Pobierz raport PDF za 21.09–27.09.2026' }));

        await waitFor(() => expect(api.downloadPdf).toHaveBeenCalledWith('WEEK', '2026-09-21', 'MEDIAN'));
        await waitFor(() => expect(saveBlobAsFile).toHaveBeenCalledWith(expect.any(Blob), 'raport-tydzien-2026-09-21-2026-09-27.pdf'));
    });

    it('nowe konto: tylko trwający okres i zapowiedź pierwszego raportu', async () => {
        api.getArchive.mockResolvedValue(archive('WEEK', 'PREVIOUS', [current]));
        renderView();

        expect(await screen.findByText(/Pierwszy raport będzie gotowy 05\.10\.2026/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Pobierz raport PDF/ })).toBeNull();
    });

    it('długa historia: starsze okresy po kliknięciu „Pokaż starsze”', async () => {
        const many = Array.from({ length: REPORTS_PAGE + 4 }, (_, i) =>
            row({ from: `2025-${String(i).padStart(4, '0')}`, label: `okres ${i}` }));
        api.getArchive.mockResolvedValue(archive('WEEK', 'PREVIOUS', [current, ...many]));
        renderView();

        expect(await screen.findAllByRole('button', { name: /Pobierz raport PDF/ })).toHaveLength(REPORTS_PAGE);
        fireEvent.click(screen.getByRole('button', { name: 'Pokaż starsze (4)' }));
        expect(screen.getAllByRole('button', { name: /Pobierz raport PDF/ })).toHaveLength(REPORTS_PAGE + 4);
    });
});
