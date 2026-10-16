// @vitest-environment jsdom
//
// Który telefon dostaje które powiadomienia: przełącznik zapisuje pełną listę
// włączonych kategorii, kategorie spoza roli nie mają przełącznika, a „Wyłącz
// wszystkie" nie rusza tego, czego na ekranie nie widać.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { DeviceNotificationSettings } from './DeviceNotificationSettings';
import { summaryOf } from '../utils/notificationCategories';
import { pushApi } from '../api/pushApi';
import type { PushNotificationSettings } from '../types';

vi.mock('../api/pushApi', () => ({
    pushApi: {
        getNotificationSettings: vi.fn(),
        updateDeviceNotifications: vi.fn(),
    },
}));

const settings = (): PushNotificationSettings => ({
    manageAll: true,
    devices: [
        {
            id: 'd1', deviceName: 'iPhone Anny', platform: 'IOS', transport: 'APNS',
            createdAt: '2026-09-01T10:00:00Z', lastUsedAt: null,
            userId: 'u1', userName: 'Anna Nowak', mine: false,
            categories: [
                { category: 'NEW_LEADS', enabled: true, available: true },
                { category: 'RESERVATIONS', enabled: true, available: true },
                { category: 'EARNINGS', enabled: true, available: false },
            ],
        },
    ],
});

const renderView = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <DeviceNotificationSettings onRevoke={vi.fn()} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    vi.mocked(pushApi.getNotificationSettings).mockResolvedValue(settings());
    vi.mocked(pushApi.updateDeviceNotifications).mockImplementation(async (id, enabled) => ({
        ...settings().devices[0],
        id,
        categories: settings().devices[0].categories.map(c => ({ ...c, enabled: enabled.includes(c.category) })),
    }));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('DeviceNotificationSettings', () => {
    it('shows the device owner and only the categories the role can receive', async () => {
        renderView();
        expect(await screen.findByText('iPhone Anny')).toBeInTheDocument();
        expect(screen.getByText('Anna Nowak')).toBeInTheDocument();
        expect(screen.getByLabelText('Nowy lead')).toBeChecked();
        expect(screen.queryByLabelText('Przychód z wydanego auta')).not.toBeInTheDocument();
        expect(screen.getByText(/rola tej osoby nie ma/)).toBeInTheDocument();
    });

    it('turning one category off saves the rest as enabled', async () => {
        renderView();
        await userEvent.click(await screen.findByLabelText('Nowa rezerwacja'));
        await waitFor(() => expect(pushApi.updateDeviceNotifications).toHaveBeenCalled());
        const [id, enabled] = vi.mocked(pushApi.updateDeviceNotifications).mock.calls[0];
        expect(id).toBe('d1');
        expect([...enabled].sort()).toEqual(['EARNINGS', 'NEW_LEADS']);
    });

    it('"Wyłącz wszystkie" keeps categories hidden from the screen as they were', async () => {
        renderView();
        await screen.findByText('iPhone Anny');
        await userEvent.click(screen.getByRole('button', { name: 'Wyłącz wszystkie' }));
        await waitFor(() => expect(pushApi.updateDeviceNotifications).toHaveBeenCalledWith('d1', ['EARNINGS']));
        expect(within(screen.getByRole('button', { expanded: true })).getByText('Wszystkie wyłączone')).toBeInTheDocument();
    });
});

describe('summaryOf', () => {
    it('counts only what the role can receive', () => {
        expect(summaryOf([
            { category: 'NEW_LEADS', enabled: true, available: true },
            { category: 'RESERVATIONS', enabled: false, available: true },
            { category: 'EARNINGS', enabled: true, available: false },
        ])).toBe('1 z 2 rodzajów');
    });
});
