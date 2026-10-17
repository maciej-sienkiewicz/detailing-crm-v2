// @vitest-environment jsdom
//
// Zakładka „Moje konta": bez połączenia jedynym wypełnionym przyciskiem jest „Połącz
// Instagram" (Google zostaje przy odcieniu), po połączeniu wypełnienie może przejść
// na wizytówkę Google - nigdy dwa naraz (CLAUDE.md §2). Wynik powrotu z logowania
// pokazuje się raz i znika z adresu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { accountsApi } from '../../api/accountsApi';
import type { GoogleBusiness, InstagramConnection } from '../../accountsTypes';
import { MyAccountsTab } from './MyAccountsTab';

// Preferencje powiadomień mają własne testy i własne API - tu sprawdzamy same konta.
vi.mock('@/common/components/notifications', () => ({ MarketNotificationPreferences: () => null }));

vi.mock('../../api/accountsApi', async importOriginal => {
    const actual = await importOriginal<typeof import('../../api/accountsApi')>();
    return {
        ...actual,
        accountsApi: {
            getConnection: vi.fn(),
            getMine: vi.fn(),
            listThreads: vi.fn(async () => []),
            getSettings: vi.fn(async () => ({ weeklyPostGoal: 3 })),
            getGoogle: vi.fn(),
        },
    };
});

const connection = (patch: Partial<InstagramConnection> = {}): InstagramConnection => ({
    available: true, status: 'NOT_CONNECTED', username: null, pageName: null, connectedAt: null,
    lastSyncAt: null, lastError: null, messagingEnabled: false, candidates: [], ...patch,
});

const google = (patch: Partial<GoogleBusiness> = {}): GoogleBusiness => ({
    available: true, status: 'NOT_CONNECTED', locationTitle: null, locationAddress: null, lastSyncAt: null,
    lastError: null, candidates: [], averageRating: null, totalReviews: null, last30: null, previous30: null,
    dataUntil: null, reviews: [], unansweredReviews: 0, ...patch,
});

const renderTab = (url = '/instagram?widok=moj') => {
    const router = createMemoryRouter([{ path: '/instagram', element: <MyAccountsTab /> }], { initialEntries: [url] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <ThemeProvider theme={theme}>
            <QueryClientProvider client={client}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        </ThemeProvider>,
    );
    return router;
};

const filled = () => document.querySelectorAll('[data-variant="primary"], [data-variant="success"]');

beforeEach(() => {
    vi.mocked(accountsApi.getGoogle).mockResolvedValue(google());
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('MyAccountsTab', () => {
    it('bez połączenia jedynym wypełnieniem jest „Połącz Instagram"', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection());

        renderTab();

        const connect = await screen.findByRole('button', { name: /Połącz Instagram/ });
        await screen.findByRole('button', { name: /Połącz wizytówkę Google/ });
        expect(connect.getAttribute('data-variant')).toBe('primary');
        expect(screen.getByRole('button', { name: /Połącz wizytówkę Google/ }).getAttribute('data-variant')).toBe('tinted');
        expect(filled()).toHaveLength(1);
    });

    it('po połączeniu Instagrama wypełnienie przechodzi na wizytówkę Google', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection({
            status: 'CONNECTED', username: 'studio', pageName: 'Studio', messagingEnabled: true,
        }));
        vi.mocked(accountsApi.getMine).mockResolvedValue({
            connection: connection({ status: 'CONNECTED' }), followers: 3850, last30: null, previous30: null,
            bestHours: [], cities: [], topPosts: [], syncedAt: null,
        });

        renderTab();

        const connectGoogle = await screen.findByRole('button', { name: /Połącz wizytówkę Google/ });
        await screen.findByText('@studio');
        expect(connectGoogle.getAttribute('data-variant')).toBe('primary');
        expect(filled()).toHaveLength(1);
    });

    it('instalacja bez aplikacji Meta nie pokazuje przycisku, tylko informację', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection({ available: false }));

        renderTab();

        await screen.findByText('Połączenie jeszcze niedostępne');
        expect(screen.queryByRole('button', { name: /Połącz Instagram/ })).toBeNull();
    });

    it('wynik logowania pokazuje się raz i znika z adresu', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection());

        const router = renderTab('/instagram?widok=moj&polaczenie=blad&powod=brak-konta');

        await screen.findByText('Nie udało się połączyć Instagrama');
        await waitFor(() => expect(router.state.location.search).toBe('?widok=moj'));
        expect(screen.getByText(/firmowym kontem Instagram/)).toBeTruthy();
    });
});
