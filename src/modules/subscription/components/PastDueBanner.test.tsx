// @vitest-environment jsdom
//
// Karencja po końcu opłaconego okresu: baner nad każdym widokiem, bez wypełnienia
// (krokiem następnym w widoku jest praca, nie płatność), właściciel dostaje drogę
// do Abonamentu, reszta zespołu - prośbę do właściciela. Na zakładce Abonament
// baneru nie ma, bo ten sam komunikat stoi tam z przyciskiem płatności.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { PastDueBanner } from './PastDueBanner';
import { subscriptionApi, type SubscriptionStatusResponse } from '@/modules/settings/api/subscriptionApi';

const permissions = vi.hoisted(() => ({ isOwner: true }));

vi.mock('@/core/permissions/usePermissions', () => ({
    usePermissions: () => ({ isOwner: permissions.isOwner, can: () => true, defaultRoute: '/' }),
}));

vi.mock('@/modules/settings/api/subscriptionApi', () => ({
    subscriptionApi: { getStatus: vi.fn() },
}));

const status = (overrides: Partial<SubscriptionStatusResponse> = {}): SubscriptionStatusResponse => ({
    status: 'PAST_DUE',
    isAccessible: true,
    daysRemaining: 4,
    subscriptionEndsAt: '2026-09-28T10:00:00Z',
    trialEndsAt: null,
    trialUsed: true,
    graceEndsAt: '2026-10-05T10:00:00Z',
    inGrace: true,
    ...overrides,
});

const renderBanner = (path = '/dashboard') => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <MemoryRouter initialEntries={[path]}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <PastDueBanner />
                </ThemeProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
};

/** Wypełnione przyciski: w banerze nie ma ich być wcale (CLAUDE.md §2). */
const filled = () => document.body.querySelectorAll('[data-variant="primary"], [data-variant="success"]');

beforeEach(() => {
    permissions.isOwner = true;
    vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status());
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('PastDueBanner', () => {
    it('karencja: data końca dostępu i akcja dla właściciela, bez żadnego wypełnienia', async () => {
        renderBanner();

        expect(await screen.findByText('Opłacony okres abonamentu minął')).toBeTruthy();
        expect(screen.getByText(/Pełny dostęp działa do 5 października 2026/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Przedłuż abonament' })).toBeTruthy();
        expect(filled()).toHaveLength(0);
        expect(screen.queryByText(/nie przeszła/)).toBeNull();
    });

    it('pracownik: prośba do właściciela zamiast przycisku', async () => {
        permissions.isOwner = false;
        renderBanner();

        expect(await screen.findByText(/Poproś właściciela studia/)).toBeTruthy();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('na zakładce Abonament baneru nie ma', async () => {
        renderBanner('/settings?tab=plan');
        await waitFor(() => expect(subscriptionApi.getStatus).toHaveBeenCalled());
        // Odpowiedź statusu dochodzi w mikrozadaniu - dopiero po niej brak baneru coś znaczy.
        await act(async () => {});
        expect(screen.queryByText('Opłacony okres abonamentu minął')).toBeNull();
    });

    it('aktywny abonament: nic', async () => {
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({ status: 'ACTIVE', inGrace: false, graceEndsAt: null }));
        renderBanner();
        await waitFor(() => expect(subscriptionApi.getStatus).toHaveBeenCalled());
        // Odpowiedź statusu dochodzi w mikrozadaniu - dopiero po niej brak baneru coś znaczy.
        await act(async () => {});
        expect(screen.queryByText('Opłacony okres abonamentu minął')).toBeNull();
    });
});
