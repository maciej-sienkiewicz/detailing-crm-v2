// @vitest-environment jsdom
//
// „Powiadomienie o nowym raporcie" w panelu Powiadomień: ustawienie osoby z dostępem do raportu.
// Tylko „jak często" - czy raport przychodzi, decyduje tabela „Rodzaje powiadomień".
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ownerReportApi } from '../api/ownerReportApi';
import { ReportNotificationSetting } from './ReportNotificationSetting';

vi.mock('../api/ownerReportApi', () => ({
    ownerReportApi: {
        downloadPdf: vi.fn(),
        getNotification: vi.fn(),
        updateNotification: vi.fn(),
    },
}));

const access = { allowed: true };
vi.mock('@/core/permissions/usePermissions', () => ({
    usePermissions: () => ({ can: () => access.allowed, isOwner: false, defaultRoute: '/' }),
}));

const api = vi.mocked(ownerReportApi);

function renderSetting() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ReportNotificationSetting />
            </ThemeProvider>
        </QueryClientProvider>,
    );
}

describe('ReportNotificationSetting', () => {
    beforeEach(() => {
        access.allowed = true;
        api.getNotification.mockResolvedValue('WEEKLY');
        api.updateNotification.mockImplementation(async frequency => frequency);
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('nie ma „Wyłączone" - to robi tabela', async () => {
        renderSetting();
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Co tydzień' }).getAttribute('aria-pressed')).toBe('true'),
        );
        expect(screen.queryByRole('button', { name: 'Wyłączone' })).toBeNull();
    });

    it('dawne „OFF" ze starszego serwera wygląda jak co tydzień', async () => {
        api.getNotification.mockResolvedValue('OFF');
        renderSetting();
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Co tydzień' }).getAttribute('aria-pressed')).toBe('true'),
        );
    });

    it('zmienia częstotliwość na co miesiąc', async () => {
        renderSetting();
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Co tydzień' }).getAttribute('aria-pressed')).toBe('true'),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Co miesiąc' }));

        await waitFor(() => expect(api.updateNotification).toHaveBeenCalledWith('MONTHLY'));
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Co miesiąc' }).getAttribute('aria-pressed')).toBe('true'),
        );
    });

    it('bez dostępu do raportu nie ma czego ustawiać', () => {
        access.allowed = false;
        renderSetting();
        expect(screen.queryByText('Powiadomienie o nowym raporcie')).toBeNull();
        expect(api.getNotification).not.toHaveBeenCalled();
    });
});
