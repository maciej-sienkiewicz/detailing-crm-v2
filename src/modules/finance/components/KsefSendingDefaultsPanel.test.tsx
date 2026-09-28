// @vitest-environment jsdom
//
// Ustawienia → Faktury: „Faktury wystawia księgowość" zapisuje się osobno od domyślnej
// wysyłki do KSeF, a po włączeniu wysyłka traci sens - CRM nie tworzy wtedy faktur.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { KsefSendingDefaultsPanel } from './KsefSendingDefaultsPanel';
import { ksefApi } from '../api/ksefApi';

vi.mock('@/modules/subscription', () => ({ useCapability: () => ({ enabled: true, isLoading: false }) }));
vi.mock('../api/ksefApi', () => ({
    ksefApi: { getInvoicingStatus: vi.fn(), updateInvoicingSettings: vi.fn() },
}));

const status = (invoicesIssuedExternally: boolean) => ({
    configured: true, tokenChecked: true, tokenValid: true, permissionsKnown: true, canIssueInvoices: true,
    checkedAt: null, autoSendDefault: true, invoicesIssuedExternally,
});

const renderPanel = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <KsefSendingDefaultsPanel />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    vi.mocked(ksefApi.updateInvoicingSettings).mockResolvedValue({ autoSendDefault: true, invoicesIssuedExternally: true });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('KsefSendingDefaultsPanel', () => {
    it('włączenie trybu księgowości zapisuje tylko tę flagę', async () => {
        vi.mocked(ksefApi.getInvoicingStatus).mockResolvedValue(status(false));
        const user = userEvent.setup();
        renderPanel();

        const toggle = await screen.findByRole('switch', { name: 'Faktury wystawia księgowość' });
        await waitFor(() => expect((toggle as HTMLInputElement).disabled).toBe(false));
        await user.click(toggle);

        await waitFor(() =>
            expect(ksefApi.updateInvoicingSettings).toHaveBeenCalledWith({ invoicesIssuedExternally: true }),
        );
    });

    it('przy fakturach od księgowości wysyłka do KSeF jest wyłączona i zgaszona', async () => {
        vi.mocked(ksefApi.getInvoicingStatus).mockResolvedValue(status(true));
        renderPanel();

        await waitFor(() =>
            expect((screen.getByRole('switch', { name: 'Faktury wystawia księgowość' }) as HTMLInputElement).checked).toBe(true),
        );
        const send = screen.getByRole('switch', { name: 'Domyślnie wysyłaj fakturę do KSeF' }) as HTMLInputElement;
        expect(send.checked).toBe(false);
        expect(send.disabled).toBe(true);
        expect(document.body.textContent).toContain('pobieranie z KSeF');
    });
});
