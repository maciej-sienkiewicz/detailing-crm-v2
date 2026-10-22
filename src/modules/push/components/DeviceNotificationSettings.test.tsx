// @vitest-environment jsdom
//
// Tabela „Rodzaje powiadomień": który telefon dostaje które powiadomienia. Przełącznik
// zapisuje pełną listę włączonych kategorii, kategorie spoza roli nie mają przełącznika,
// a „Wyłącz wszystkie" nie rusza tego, czego na ekranie nie widać.
//
// Zgłoszenie, od którego wyszła tabela: przy dwóch urządzeniach rodzaje powiadomień
// siedziały w zwiniętych wierszach i „znikały" z ekranu - właściciel pytał, gdzie się
// podziały leady i zakończone wizyty. Teraz są widoczne od razu, dla każdego urządzenia.
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
import type { PushDeviceNotifications, PushNotificationSettings } from '../types';

vi.mock('../api/pushApi', () => ({
    pushApi: {
        getNotificationSettings: vi.fn(),
        updateDeviceNotifications: vi.fn(),
    },
}));

const device = (over: Partial<PushDeviceNotifications>): PushDeviceNotifications => ({
    id: 'd1', deviceName: 'iPhone Anny', platform: 'IOS', transport: 'APNS',
    createdAt: '2026-09-01T10:00:00Z', lastUsedAt: null,
    userId: 'u1', userName: 'Anna Nowak', mine: false,
    categories: [
        { category: 'NEW_LEADS', enabled: true, available: true },
        { category: 'RESERVATIONS', enabled: true, available: true },
        { category: 'EARNINGS', enabled: true, available: false },
    ],
    ...over,
});

const settings = (devices: PushDeviceNotifications[] = [device({})]): PushNotificationSettings => ({
    manageAll: true,
    devices,
});

const renderView = (props: { currentDeviceId?: string | null } = {}) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <DeviceNotificationSettings onRevoke={vi.fn()} {...props} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    vi.mocked(pushApi.getNotificationSettings).mockResolvedValue(settings());
    vi.mocked(pushApi.updateDeviceNotifications).mockImplementation(async (id, enabled) => ({
        ...device({}),
        id,
        categories: device({}).categories.map(c => ({ ...c, enabled: enabled.includes(c.category) })),
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
        expect(screen.getByLabelText('Nowe zapytanie')).toBeChecked();
        expect(screen.queryByLabelText('Auto wydane klientowi')).not.toBeInTheDocument();
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

    it('"Wyłącz wszystkie" from the device menu keeps categories hidden from the screen as they were', async () => {
        renderView();
        await screen.findByText('iPhone Anny');
        await userEvent.click(screen.getByRole('button', { name: 'Więcej: iPhone Anny' }));
        await userEvent.click(screen.getByRole('menuitem', { name: /Wyłącz wszystkie/ }));
        await waitFor(() => expect(pushApi.updateDeviceNotifications).toHaveBeenCalledWith('d1', ['EARNINGS']));
        expect(await screen.findByText('Wszystkie wyłączone')).toBeInTheDocument();
    });

    it('two devices: every category is visible at once, one column per device, this device marked', async () => {
        vi.mocked(pushApi.getNotificationSettings).mockResolvedValue(settings([
            device({}),
            device({ id: 'd2', deviceName: 'Mac, Chrome', platform: 'DESKTOP', transport: 'WEB_PUSH', mine: true,
                categories: [
                    { category: 'NEW_LEADS', enabled: false, available: true },
                    { category: 'RESERVATIONS', enabled: true, available: true },
                    { category: 'EARNINGS', enabled: true, available: true },
                ] }),
        ]));
        renderView({ currentDeviceId: 'd2' });

        const table = await screen.findByRole('table', { name: 'Rodzaje powiadomień na urządzeniach' });
        const headers = within(table).getAllByRole('columnheader').map(h => h.textContent);
        // To urządzenie pierwsze, z oznaczeniem.
        expect(headers[1]).toContain('Mac, Chrome');
        expect(headers[1]).toContain('To urządzenie');
        expect(headers[2]).toContain('iPhone Anny');

        // Nic nie jest zwinięte - każdy rodzaj ma przełącznik w każdej kolumnie, która go dostaje.
        expect(screen.getByLabelText('Nowe zapytanie, Mac, Chrome')).not.toBeChecked();
        expect(screen.getByLabelText('Nowe zapytanie, iPhone Anny')).toBeChecked();
        expect(screen.getByLabelText('Auto wydane klientowi, Mac, Chrome')).toBeChecked();
        // Telefon Anny przychodów nie dostanie - kreska zamiast przełącznika, który niczego nie zmienia.
        expect(screen.queryByLabelText('Auto wydane klientowi, iPhone Anny')).not.toBeInTheDocument();
        expect(screen.getByText(/Kreska oznacza/)).toBeInTheDocument();

        await userEvent.click(screen.getByLabelText('Nowe zapytanie, Mac, Chrome'));
        await waitFor(() => expect(pushApi.updateDeviceNotifications).toHaveBeenCalled());
        const [id, enabled] = vi.mocked(pushApi.updateDeviceNotifications).mock.calls[0];
        expect(id).toBe('d2');
        expect([...enabled].sort()).toEqual(['EARNINGS', 'NEW_LEADS', 'RESERVATIONS']);
    });

    it('too many devices for columns: one column and a device picker', async () => {
        vi.mocked(pushApi.getNotificationSettings).mockResolvedValue(settings(
            ['a', 'b', 'c', 'd'].map((id, i) => device({ id, deviceName: `Telefon ${i + 1}` })),
        ));
        renderView();

        const picker = await screen.findByLabelText('Urządzenie');
        expect(screen.getByText('Telefon 1', { selector: 'span' })).toBeInTheDocument();

        await userEvent.selectOptions(picker, 'c');
        expect(screen.getByText('Telefon 3', { selector: 'span' })).toBeInTheDocument();
        await userEvent.click(screen.getByLabelText('Nowa rezerwacja'));
        await waitFor(() => expect(pushApi.updateDeviceNotifications).toHaveBeenCalled());
        expect(vi.mocked(pushApi.updateDeviceNotifications).mock.calls[0][0]).toBe('c');
    });

    it('no devices yet: says what to do instead of an empty frame', async () => {
        vi.mocked(pushApi.getNotificationSettings).mockResolvedValue(settings([]));
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(
            <QueryClientProvider client={client}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <DeviceNotificationSettings onRevoke={vi.fn()} emptyHint="Zeskanuj kod wyżej telefonem." />
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>,
        );
        expect(await screen.findByText('Żadne urządzenie nie odbiera jeszcze powiadomień')).toBeInTheDocument();
        expect(screen.getByText('Zeskanuj kod wyżej telefonem.')).toBeInTheDocument();
    });
});

describe('summaryOf', () => {
    it('counts only what the role can receive', () => {
        expect(summaryOf([
            { category: 'NEW_LEADS', enabled: true, available: true },
            { category: 'RESERVATIONS', enabled: false, available: true },
            { category: 'EARNINGS', enabled: true, available: false },
        ])).toBe('Włączone 1 z 2');
    });
});
