// @vitest-environment jsdom
//
// Blokada po bezczynności zapisuje się od razu po wyborze. Gdy zapis się nie udał,
// lista zostawała na nowej wartości - wyglądało to na ustawioną blokadę, której
// serwer nie znał. Test pilnuje powrotu do wartości z serwera i widocznego błędu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { SecuritySection } from './SecuritySection';
import { idleTimeoutApi } from '../api/idleTimeoutApi';

vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ user: { email: 'owner@studio.pl' }, setUser: vi.fn() }),
}));
vi.mock('@/core/permissions', async importOriginal => ({
    ...(await importOriginal<typeof import('@/core/permissions')>()),
    usePermissions: () => ({ isOwner: true, can: () => true, defaultRoute: '/' }),
}));
vi.mock('./security/PinCard', () => ({ PinCard: () => null }));
vi.mock('./account/ClearAccountModal', () => ({ ClearAccountModal: () => null }));
vi.mock('../api/idleTimeoutApi', () => ({
    idleTimeoutApi: { get: vi.fn(), set: vi.fn() },
}));

const renderSection = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <SecuritySection />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

const select = () => screen.getByRole('combobox', { name: /czas bezczynności/i }) as HTMLSelectElement;

beforeEach(() => {
    vi.mocked(idleTimeoutApi.get).mockResolvedValue({ idleTimeoutSeconds: 300 });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('SecuritySection - blokada po bezczynności', () => {
    it('udany zapis zostawia nową wartość i mówi „Zapisano"', async () => {
        vi.mocked(idleTimeoutApi.set).mockResolvedValue({ idleTimeoutSeconds: 900 });
        renderSection();
        await waitFor(() => expect(select().value).toBe('300'));

        await userEvent.selectOptions(select(), '900');
        expect(await screen.findByText('Zapisano')).toBeTruthy();
        expect(select().value).toBe('900');
    });

    it('nieudany zapis wraca do wartości z serwera i pokazuje błąd', async () => {
        vi.mocked(idleTimeoutApi.set).mockRejectedValue({ response: { status: 503, data: {} }, config: {} });
        renderSection();
        await waitFor(() => expect(select().value).toBe('300'));

        await userEvent.selectOptions(select(), '900');
        expect(await screen.findByText('Nie udało się zmienić blokady ekranu')).toBeTruthy();
        await waitFor(() => expect(select().value).toBe('300'));
        expect(screen.queryByText('Zapisano')).toBeNull();
    });
});
