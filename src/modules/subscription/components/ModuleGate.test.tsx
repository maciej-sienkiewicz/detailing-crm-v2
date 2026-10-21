// @vitest-environment jsdom
//
// Zablokowany moduł pokazuje prawdziwy widok pod rozmyciem, ale ten widok nie może
// pytać serwera: każde jego zapytanie kończyło się 402 (czerwone wiersze w Network).
// Katalog dodatków pobiera się tylko wtedy, gdy jest karta odblokowania.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ModuleGate } from './ModuleGate';

const state = vi.hoisted(() => ({ enabled: false, loading: false }));
const useAddOns = vi.hoisted(() => vi.fn(() => ({ data: [] })));

vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'OWNER' } }) }));
vi.mock('@/core/native/platform', () => ({ canPurchaseHere: () => true }));
vi.mock('../hooks/useFeature', () => ({ useFeature: () => ({ enabled: state.enabled, upsell: null }) }));
vi.mock('../hooks/useAddOnUnlock', () => ({ useAddOnUnlock: () => ({ dialogOpen: false, openUnlockDialog: vi.fn() }) }));
vi.mock('../api/subscriptionQueries', () => ({
    useEntitlements: () => ({ isLoading: state.loading }),
    useAddOns,
}));

const fetchReport = vi.fn(async () => ({ total: 1 }));

/** Widok modułu: jedno zapytanie zwykłe i jedno z jawnym `enabled: true`. */
const ModuleView = () => {
    useQuery({ queryKey: ['finance', 'summary'], queryFn: fetchReport });
    useQuery({ queryKey: ['finance', 'cash'], queryFn: fetchReport, enabled: true });
    return <p>widok modułu</p>;
};

const renderGate = () => render(
    <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider theme={theme}>
            <ModuleGate featureKey="FINANCE" benefits={['Faktury']}>
                <ModuleView />
            </ModuleGate>
        </ThemeProvider>
    </QueryClientProvider>,
);

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.enabled = false;
    state.loading = false;
});

describe('ModuleGate', () => {
    it('w podglądzie zablokowanego modułu nie wysyła zapytań widoku', async () => {
        renderGate();

        expect(await screen.findByText('widok modułu')).toBeInTheDocument();
        await new Promise(resolve => setTimeout(resolve, 20));
        expect(fetchReport).not.toHaveBeenCalled();
        expect(useAddOns).toHaveBeenLastCalledWith({ enabled: true });
    });

    it('kupiony moduł pyta serwer normalnie i nie pobiera katalogu dodatków', async () => {
        state.enabled = true;

        renderGate();

        await vi.waitFor(() => expect(fetchReport).toHaveBeenCalledTimes(2));
        expect(useAddOns).toHaveBeenLastCalledWith({ enabled: false });
    });

    it('do wczytania uprawnień nie renderuje widoku', async () => {
        state.loading = true;

        renderGate();

        await new Promise(resolve => setTimeout(resolve, 20));
        expect(screen.queryByText('widok modułu')).not.toBeInTheDocument();
        expect(fetchReport).not.toHaveBeenCalled();
    });
});
