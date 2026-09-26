// @vitest-environment jsdom
//
// Statystyki → „Raport PDF": pełne okresy z backendu, porównanie z poprzednim okresem
// albo medianą, wejście z powiadomienia push otwiera okno samo.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { saveBlobAsFile } from '@/common/utils/blobFile';
import { ownerReportApi, type ReportLength } from '../api/ownerReportApi';
import { ReportButton } from './ReportDialog';

vi.mock('../api/ownerReportApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/ownerReportApi')>()),
    ownerReportApi: {
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

const PERIODS: Record<ReportLength, { from: string; to: string; label: string }[]> = {
    WEEK: [
        { from: '2026-09-14', to: '2026-09-20', label: '14.09–20.09.2026' },
        { from: '2026-09-07', to: '2026-09-13', label: '07.09–13.09.2026' },
    ],
    TWO_WEEKS: [{ from: '2026-09-07', to: '2026-09-20', label: '07.09–20.09.2026' }],
    MONTH: [{ from: '2026-08-01', to: '2026-08-31', label: '01.08–31.08.2026' }],
};

function LocationProbe() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderButton(url = '/statistics') {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <MemoryRouter initialEntries={[url]}>
                    <Routes>
                        <Route path="*" element={<><ReportButton /><LocationProbe /></>} />
                    </Routes>
                </MemoryRouter>
            </ThemeProvider>
        </QueryClientProvider>,
    );
}

describe('ReportButton / ReportDialog', () => {
    beforeEach(() => {
        api.listPeriods.mockImplementation(async length => PERIODS[length]);
        api.downloadPdf.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('domyślnie: ostatni pełny tydzień porównany z poprzednim', async () => {
        renderButton();
        fireEvent.click(screen.getByRole('button', { name: /Raport PDF/ }));

        const select = await screen.findByRole('combobox', { name: 'Który okres' }) as HTMLSelectElement;
        await waitFor(() => expect(select.value).toBe('2026-09-14'));
        expect(screen.getByRole('button', { name: 'Poprzedni okres' }).getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(screen.getByRole('button', { name: /Pobierz PDF/ }));

        await waitFor(() => expect(api.downloadPdf).toHaveBeenCalledWith('WEEK', '2026-09-14', 'PREVIOUS'));
        await waitFor(() =>
            expect(saveBlobAsFile).toHaveBeenCalledWith(expect.any(Blob), 'raport-tydzien-2026-09-14-2026-09-20.pdf'),
        );
    });

    it('miesiąc porównany z medianą', async () => {
        renderButton();
        fireEvent.click(screen.getByRole('button', { name: /Raport PDF/ }));
        fireEvent.click(await screen.findByRole('button', { name: 'Miesiąc' }));
        fireEvent.click(screen.getByRole('button', { name: 'Mediana 6 okresów' }));

        await waitFor(() => expect(api.listPeriods).toHaveBeenCalledWith('MONTH'));
        await screen.findByRole('option', { name: '01.08–31.08.2026' });
        fireEvent.click(screen.getByRole('button', { name: /Pobierz PDF/ }));

        await waitFor(() => expect(api.downloadPdf).toHaveBeenCalledWith('MONTH', '2026-08-01', 'MEDIAN'));
    });

    it('wybór starszego okresu z listy', async () => {
        renderButton();
        fireEvent.click(screen.getByRole('button', { name: /Raport PDF/ }));
        await screen.findByRole('option', { name: '07.09–13.09.2026' });
        fireEvent.change(screen.getByRole('combobox', { name: 'Który okres' }), { target: { value: '2026-09-07' } });
        fireEvent.click(screen.getByRole('button', { name: /Pobierz PDF/ }));

        await waitFor(() => expect(api.downloadPdf).toHaveBeenCalledWith('WEEK', '2026-09-07', 'PREVIOUS'));
    });

    it('link z powiadomienia otwiera okno na wskazanym okresie, zamknięcie czyści adres', async () => {
        renderButton('/statistics?raport=TWO_WEEKS&od=2026-09-07');

        const select = await screen.findByRole('combobox', { name: 'Który okres' }) as HTMLSelectElement;
        await waitFor(() => expect(select.value).toBe('2026-09-07'));
        expect(screen.getByRole('button', { name: '2 tygodnie' }).getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(screen.getByRole('button', { name: /zamknij/i }));

        await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/statistics'));
        expect(screen.queryByRole('combobox', { name: 'Który okres' })).toBeNull();
    });

    it('błąd serwera zostaje w oknie', async () => {
        api.downloadPdf.mockRejectedValue({ response: { data: { message: 'Raport jest dostępny tylko za pełny, zakończony okres' } } });
        renderButton();
        fireEvent.click(screen.getByRole('button', { name: /Raport PDF/ }));
        await screen.findByRole('option', { name: '14.09–20.09.2026' });
        fireEvent.click(screen.getByRole('button', { name: /Pobierz PDF/ }));

        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(screen.getByText('Raport jest dostępny tylko za pełny, zakończony okres')).toBeTruthy();
    });

    it('przejście do ustawień powiadomienia', async () => {
        renderButton();
        fireEvent.click(screen.getByRole('button', { name: /Raport PDF/ }));
        fireEvent.click(await screen.findByRole('button', { name: /Powiadomienie o nowym raporcie/ }));

        expect(screen.getByTestId('location').textContent).toBe('/settings?tab=mobile-devices&view=notifications');
    });
});
