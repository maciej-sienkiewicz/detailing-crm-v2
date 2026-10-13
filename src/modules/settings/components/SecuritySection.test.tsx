// @vitest-environment jsdom
//
// Blokada po bezczynności to ustawienie URZĄDZENIA: wybór zapisuje się w tej przeglądarce
// i nie zmienia innych stanowisk studia. Dopóki urządzenie nie ma własnego ustawienia,
// lista pokazuje dotychczasową wartość studia - tę, która naprawdę obowiązuje.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { getDeviceIdleTimeout } from '@/core/deviceIdleLock';
import { SecuritySection } from './SecuritySection';

vi.mock('@/core/context/AuthContext', () => ({
    // idleTimeoutSeconds z /auth/me - dotychczasowa wartość studia.
    useAuth: () => ({ user: { email: 'owner@studio.pl', idleTimeoutSeconds: 300 }, setUser: vi.fn() }),
}));
vi.mock('@/core/permissions', async importOriginal => ({
    ...(await importOriginal<typeof import('@/core/permissions')>()),
    usePermissions: () => ({ isOwner: true, can: () => true, defaultRoute: '/' }),
}));
vi.mock('./security/PinCard', () => ({ PinCard: () => null }));
vi.mock('./account/ClearAccountModal', () => ({ ClearAccountModal: () => null }));

const renderSection = () => render(
    <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider theme={theme}>
            <ToastProvider>
                <SecuritySection />
            </ToastProvider>
        </ThemeProvider>
    </QueryClientProvider>,
);

const select = () => screen.getByRole('combobox', { name: /czas bezczynności/i }) as HTMLSelectElement;

beforeEach(() => localStorage.clear());

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('SecuritySection - blokada po bezczynności na tym urządzeniu', () => {
    it('bez ustawienia na urządzeniu pokazuje wartość studia, która obowiązuje', () => {
        renderSection();

        expect(select().value).toBe('300');
        expect(screen.getByText(/Tylko na tym urządzeniu/)).toBeTruthy();
    });

    it('wybór zapisuje się na tym urządzeniu i mówi „Zapisano"', async () => {
        renderSection();

        await userEvent.selectOptions(select(), '900');

        expect(await screen.findByText('Zapisano')).toBeTruthy();
        expect(select().value).toBe('900');
        expect(getDeviceIdleTimeout()).toBe(900);
    });

    it('wyłączenie na tym urządzeniu to zapisane 0, a nie powrót do wartości studia', async () => {
        renderSection();

        await userEvent.selectOptions(select(), '0');

        expect(getDeviceIdleTimeout()).toBe(0);
        expect(select().value).toBe('0');
    });

    it('gdy przeglądarka nie pozwala zapisać, lista zostaje i jest widoczny błąd', async () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
        renderSection();

        await userEvent.selectOptions(select(), '900');

        expect(await screen.findByText('Nie udało się zapisać blokady na tym urządzeniu')).toBeTruthy();
        expect(select().value).toBe('300');
        expect(screen.queryByText('Zapisano')).toBeNull();
    });
});
