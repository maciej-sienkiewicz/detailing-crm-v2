// @vitest-environment jsdom
//
// Poza oknem wysyłki (12:00–18:00) backend odkłada SMS do kolejki i mówi kiedy wyjdzie.
// Okno wyrzucało tę odpowiedź i wieczorem pokazywało „SMS wysłany. Wiadomość poszła na …",
// choć klient dostawał SMS dopiero następnego dnia w południe (odtworzone w audycie SMS).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { SendSmsModal } from './SendSmsModal';
import { customerEditApi } from '../api/customerEditApi';

vi.mock('../api/customerEditApi', () => ({
    customerEditApi: { sendSms: vi.fn() },
}));

vi.mock('@/modules/comms/hooks/useComms', () => ({
    useProofread: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/modules/subscription/hooks/useCapabilityGate', () => ({
    useCapabilityGate: () => ({ enabled: true, run: (action: () => void) => action(), upsell: null }),
}));

const renderModal = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <SendSmsModal customerId="c1" customerName="Adam Pietrzak" phone="+48784034486" onClose={() => {}} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

const send = async () => {
    await userEvent.type(screen.getByPlaceholderText('Napisz wiadomość do klienta…'), 'Auto czeka na odbiór.');
    await userEvent.click(screen.getByRole('button', { name: /Wyślij SMS/ }));
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('SendSmsModal', () => {
    it('SMS odłożony do kolejki: toast mówi, kiedy klient go dostanie, a nie „wysłany"', async () => {
        vi.mocked(customerEditApi.sendSms).mockResolvedValue({ queued: true, scheduledFor: '2026-10-24T10:00:00Z' });
        renderModal();
        await send();

        expect(await screen.findByText('SMS zaplanowany')).toBeTruthy();
        expect(screen.getByText(/Klient dostanie go .*24\.10\.2026.* na \+48784034486\./)).toBeTruthy();
        expect(screen.queryByText('SMS wysłany')).toBeNull();
    });

    it('SMS wysłany od razu: toast jak dotąd', async () => {
        vi.mocked(customerEditApi.sendSms).mockResolvedValue({ queued: false, scheduledFor: null });
        renderModal();
        await send();

        expect(await screen.findByText('SMS wysłany')).toBeTruthy();
    });
});
