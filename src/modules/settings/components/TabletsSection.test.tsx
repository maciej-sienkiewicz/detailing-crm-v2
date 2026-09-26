// @vitest-environment jsdom
//
// Tablety do podpisu: odmiana licznika („2 tablety/ów" było na ekranie),
// odłączenie przez okno potwierdzenia i błąd wczytania, który nie udaje pustej listy.
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { TabletsSection } from './TabletsSection';
import { tabletsApi } from '../api/tabletsApi';
import { tabletsWord } from './devicesLayout';

vi.mock('@/modules/subscription', () => ({
    useCapability: () => ({ enabled: true }),
    RequireCapability: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../hooks/useTabletsSocket', () => ({ useTabletsSocket: () => undefined }));

vi.mock('../api/tabletsApi', () => ({
    tabletsApi: { listTablets: vi.fn(), deleteTablet: vi.fn(), generatePairingCode: vi.fn() },
}));

const TABLETS = [
    { tabletId: 't1', deviceName: 'iPad recepcja', pairedAt: '2026-09-01T10:00:00Z', lastSeenAt: new Date().toISOString() },
    { tabletId: 't2', deviceName: 'Galaxy Tab', pairedAt: '2026-08-01T10:00:00Z', lastSeenAt: null },
];

const renderSection = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <MemoryRouter>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <TabletsSection />
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
};

beforeEach(() => {
    vi.mocked(tabletsApi.listTablets).mockResolvedValue(TABLETS);
    vi.mocked(tabletsApi.deleteTablet).mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('tabletsWord', () => {
    it('declines in Polish', () => {
        expect([1, 2, 4, 5, 12, 22, 25].map(n => `${n} ${tabletsWord(n)}`)).toEqual([
            '1 tablet', '2 tablety', '4 tablety', '5 tabletów', '12 tabletów', '22 tablety', '25 tabletów',
        ]);
    });
});

describe('TabletsSection', () => {
    it('counts tablets with the right plural and puts pairing in the header action', async () => {
        renderSection();
        expect(await screen.findByText('2 tablety')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sparuj tablet/ })).toBeInTheDocument();
    });

    it('asks before unpairing; cancel keeps the tablet', async () => {
        renderSection();
        await screen.findByText('iPad recepcja');
        await userEvent.click(screen.getAllByRole('button', { name: 'Odłącz' })[0]);
        expect(screen.getByText(/„iPad recepcja” przestanie przyjmować podpisy/)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
        expect(tabletsApi.deleteTablet).not.toHaveBeenCalled();

        await userEvent.click(screen.getAllByRole('button', { name: 'Odłącz' })[0]);
        await userEvent.click(screen.getByRole('button', { name: 'Odłącz tablet' }));
        await waitFor(() => expect(tabletsApi.deleteTablet).toHaveBeenCalledWith('t1'));
        expect(await screen.findByText('Tablet odłączony')).toBeInTheDocument();
    });

    it('a failed unpair (network) is reported instead of ending in silence', async () => {
        vi.mocked(tabletsApi.deleteTablet).mockRejectedValue(new Error('Network Error'));
        renderSection();
        await screen.findByText('iPad recepcja');
        await userEvent.click(screen.getAllByRole('button', { name: 'Odłącz' })[0]);
        await userEvent.click(screen.getByRole('button', { name: 'Odłącz tablet' }));
        expect(await screen.findByText('Nie udało się odłączyć tabletu')).toBeInTheDocument();
    });

    it('a failed load is not an empty list', async () => {
        vi.mocked(tabletsApi.listTablets).mockRejectedValue(new Error('500'));
        renderSection();
        expect(await screen.findByText('Nie udało się wczytać tabletów')).toBeInTheDocument();
        expect(screen.queryByText('Brak sparowanych tabletów')).not.toBeInTheDocument();
    });
});
