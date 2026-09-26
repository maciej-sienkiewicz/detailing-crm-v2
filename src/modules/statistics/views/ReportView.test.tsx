// @vitest-environment jsdom
//
// Statystyki → Raport: pobranie PDF za wybrany okres i wysyłka mailem (tylko właściciel).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { saveBlobAsFile } from '@/common/utils/blobFile';
import { ownerReportApi } from '../api/ownerReportApi';
import { ReportView } from './ReportView';

vi.mock('../api/ownerReportApi', () => ({
    ownerReportApi: {
        downloadPdf: vi.fn(),
        getSettings: vi.fn(),
        updateSettings: vi.fn(),
    },
}));

vi.mock('@/common/utils/blobFile', async importOriginal => ({
    ...(await importOriginal<typeof import('@/common/utils/blobFile')>()),
    saveBlobAsFile: vi.fn(),
}));

const permissions = { isOwner: true };
vi.mock('@/core/permissions/usePermissions', () => ({
    usePermissions: () => ({ can: () => true, isOwner: permissions.isOwner, defaultRoute: '/' }),
}));

const api = vi.mocked(ownerReportApi);

function renderView() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <MemoryRouter initialEntries={['/statistics/report']}>
                    <ReportView />
                </MemoryRouter>
            </ThemeProvider>
        </QueryClientProvider>,
    );
}

describe('ReportView', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 8, 23, 10, 0)); // środa 23.09.2026
        permissions.isOwner = true;
        api.getSettings.mockResolvedValue({ frequency: 'OFF' });
        api.updateSettings.mockImplementation(async frequency => ({ frequency }));
        api.downloadPdf.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('pobiera PDF za ostatni pełny tydzień z okresem widocznym przy przycisku', async () => {
        renderView();
        expect(screen.getByText('14.09–20.09.2026')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Pobierz PDF/ }));

        await waitFor(() => expect(api.downloadPdf).toHaveBeenCalledWith('2026-09-14', '2026-09-20'));
        await waitFor(() => expect(saveBlobAsFile).toHaveBeenCalledWith(expect.any(Blob), 'raport-2026-09-14-2026-09-20.pdf'));
    });

    it('dwa tygodnie zmieniają okres pobrania', async () => {
        renderView();
        fireEvent.click(screen.getByRole('button', { name: 'Ostatnie 2 tygodnie' }));
        expect(screen.getByText('07.09–20.09.2026')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Pobierz PDF/ }));
        await waitFor(() => expect(api.downloadPdf).toHaveBeenCalledWith('2026-09-07', '2026-09-20'));
    });

    it('błędny własny okres blokuje pobranie', () => {
        renderView();
        fireEvent.click(screen.getByRole('button', { name: 'Własny okres' }));
        fireEvent.change(screen.getByLabelText('Od'), { target: { value: '2026-09-20' } });
        fireEvent.change(screen.getByLabelText('Do'), { target: { value: '2026-09-10' } });

        expect(screen.getByText('Data końca jest przed datą początku.')).toBeTruthy();
        expect((screen.getByRole('button', { name: /Pobierz PDF/ }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('błąd serwera pokazuje komunikat pod przyciskiem', async () => {
        api.downloadPdf.mockRejectedValue({ response: { data: { message: 'Raport obejmuje najwyżej 93 dni' } } });
        renderView();
        fireEvent.click(screen.getByRole('button', { name: /Pobierz PDF/ }));

        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(screen.getByText('Raport obejmuje najwyżej 93 dni')).toBeTruthy();
    });

    it('właściciel włącza wysyłkę mailem co tydzień', async () => {
        renderView();
        await waitFor(() => expect(api.getSettings).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: 'Co tydzień' }));

        await waitFor(() => expect(api.updateSettings).toHaveBeenCalledWith('WEEKLY'));
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Co tydzień' }).getAttribute('aria-pressed')).toBe('true'),
        );
    });

    it('pracownik bez roli właściciela nie widzi wysyłki mailem', () => {
        permissions.isOwner = false;
        renderView();
        expect(screen.queryByText('Wysyłka mailem')).toBeNull();
        expect(api.getSettings).not.toHaveBeenCalled();
    });
});
