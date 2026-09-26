// @vitest-environment jsdom
//
// Odłączenie KSeF pytało systemowym `window.confirm`, a nieudana weryfikacja tokenu
// nie mówiła nic. Te testy pilnują okna potwierdzenia i widocznych błędów.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { KsefCredentialsPanel } from './KsefCredentialsPanel';
import { ksefApi } from '../api/ksefApi';

vi.mock('../api/ksefApi', () => ({
    ksefApi: {
        getCredentials: vi.fn(),
        saveCredentials: vi.fn(),
        deleteCredentials: vi.fn(),
        verifyCredentials: vi.fn(),
    },
}));

const renderPanel = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <KsefCredentialsPanel />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    vi.mocked(ksefApi.getCredentials).mockResolvedValue({
        nip: '5271234567',
        tokenMasked: '••••••••1234',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
        verification: null,
    });
    vi.mocked(ksefApi.deleteCredentials).mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

describe('KsefCredentialsPanel', () => {
    it('status „Połączono" i NIP to osobne elementy, bez kropki', async () => {
        renderPanel();
        expect(await screen.findByText('Połączono')).toBeTruthy();
        expect(screen.getByText('5271234567')).toBeTruthy();
        expect(document.body.textContent).not.toContain('·');
    });

    it('odłączenie pyta oknem potwierdzenia, nie window.confirm', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm');
        renderPanel();
        await userEvent.click(await screen.findByRole('button', { name: 'Odłącz KSeF' }));

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(ksefApi.deleteCredentials).not.toHaveBeenCalled();
        expect(await screen.findByText('Odłączyć KSeF?')).toBeTruthy();

        const buttons = screen.getAllByRole('button', { name: 'Odłącz KSeF' });
        await userEvent.click(buttons[buttons.length - 1]);
        await waitFor(() => expect(ksefApi.deleteCredentials).toHaveBeenCalled());
    });

    it('rezygnacja w oknie potwierdzenia niczego nie odłącza', async () => {
        renderPanel();
        await userEvent.click(await screen.findByRole('button', { name: 'Odłącz KSeF' }));
        await userEvent.click(await screen.findByRole('button', { name: 'Anuluj' }));
        expect(ksefApi.deleteCredentials).not.toHaveBeenCalled();
    });

    it('nieudana weryfikacja tokenu (sieć/5xx) mówi o sobie toastem', async () => {
        vi.mocked(ksefApi.verifyCredentials).mockRejectedValue({ response: { status: 502, data: {} }, config: {} });
        renderPanel();
        await userEvent.click(await screen.findByRole('button', { name: 'Sprawdź uprawnienia' }));
        expect(await screen.findByText('Nie udało się sprawdzić tokenu')).toBeTruthy();
    });

    it('4xx zostawia toast interceptorowi - bez drugiego, zdublowanego', async () => {
        vi.mocked(ksefApi.verifyCredentials).mockRejectedValue({ response: { status: 400, data: { message: 'x' } }, config: {} });
        renderPanel();
        await userEvent.click(await screen.findByRole('button', { name: 'Sprawdź uprawnienia' }));
        await waitFor(() => expect(ksefApi.verifyCredentials).toHaveBeenCalled());
        expect(screen.queryByText('Nie udało się sprawdzić tokenu')).toBeNull();
    });
});
