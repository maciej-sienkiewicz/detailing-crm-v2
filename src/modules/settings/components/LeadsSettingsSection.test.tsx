// @vitest-environment jsdom
//
// Leady: przełącznik automatu i progi kolejki.
//
// Zgłoszenia, których te testy pilnują:
//   - wpisanie „800" w próg zamieniało się w trakcie pisania w „720", a skasowanie
//     liczby od razu wstawiało „1" (clamp przy każdym klawiszu);
//   - przy błędzie wczytania kręciło się kółko bez końca, a przełącznik
//     pokazywałby „wyłączone", zanim ktokolwiek wiedział, jaki jest stan.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { LeadsSettingsSection } from './LeadsSettingsSection';
import { leadsSettingsApi } from '../api/leadsSettingsApi';

vi.mock('../api/leadsSettingsApi', () => ({
    leadsSettingsApi: {
        getAutoLeadConfig: vi.fn(),
        updateAutoLeadConfig: vi.fn(),
        getAlertConfig: vi.fn(),
        updateAlertConfig: vi.fn(),
    },
}));

const renderSection = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <LeadsSettingsSection />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

const ourField = () => screen.getByLabelText('Po ilu godzinach brak odpowiedzi jest zaległością') as HTMLInputElement;

beforeEach(() => {
    vi.mocked(leadsSettingsApi.getAutoLeadConfig).mockResolvedValue({ enabled: false, enabledAt: null });
    vi.mocked(leadsSettingsApi.getAlertConfig).mockResolvedValue({
        leadStagnantOurThresholdHours: 24,
        leadStagnantClientThresholdHours: 120,
    });
    vi.mocked(leadsSettingsApi.updateAlertConfig).mockImplementation(async config => config);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('LeadsSettingsSection', () => {
    it('lets the field be cleared and typed past the limit, and clamps only on blur', async () => {
        renderSection();
        const field = await waitFor(ourField);
        // Kolejne stany pola przy pisaniu: skasowane, „8", „80", „800".
        for (const typed of ['', '8', '80', '800']) {
            fireEvent.change(field, { target: { value: typed } });
            expect(field.value).toBe(typed);
        }
        // Pasek zapisu mówi, co blokuje zapis, zanim pole zostanie opuszczone.
        expect(screen.getByText(/Próg wymaga poprawy/)).toBeInTheDocument();

        fireEvent.blur(field);
        expect(field.value).toBe('720');
    });

    it('an emptied field returns to the saved value on blur instead of becoming 1', async () => {
        renderSection();
        const field = await waitFor(ourField);
        fireEvent.change(field, { target: { value: '' } });
        fireEvent.blur(field);
        expect(field.value).toBe('24');
        expect(screen.queryByRole('region', { name: 'Niezapisane zmiany' })).not.toBeInTheDocument();
    });

    it('saves through the unsaved-changes bar and confirms with a toast', async () => {
        renderSection();
        const field = await waitFor(ourField);
        fireEvent.change(field, { target: { value: '48' } });
        fireEvent.blur(field);
        await userEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));
        await waitFor(() => expect(leadsSettingsApi.updateAlertConfig).toHaveBeenCalledWith({
            leadStagnantOurThresholdHours: 48,
            leadStagnantClientThresholdHours: 120,
        }));
        expect(await screen.findByText('Progi zapisane')).toBeInTheDocument();
    });

    it('the auto-lead switch is an accessible switch that reflects the server state', async () => {
        vi.mocked(leadsSettingsApi.getAutoLeadConfig).mockResolvedValue({ enabled: true, enabledAt: null });
        renderSection();
        const toggle = await screen.findByRole('switch', { name: 'Czy tworzyć leady automatycznie?' });
        expect(toggle).toBeChecked();
    });

    it('a failed load shows a retry notice and no switch, not an endless spinner', async () => {
        vi.mocked(leadsSettingsApi.getAutoLeadConfig).mockRejectedValue(new Error('500'));
        renderSection();
        expect(await screen.findByText('Nie udało się wczytać ustawienia automatu')).toBeInTheDocument();
        expect(screen.queryByRole('switch', { name: 'Czy tworzyć leady automatycznie?' })).not.toBeInTheDocument();

        vi.mocked(leadsSettingsApi.getAutoLeadConfig).mockResolvedValue({ enabled: false, enabledAt: null });
        await userEvent.click(screen.getAllByRole('button', { name: 'Spróbuj ponownie' })[0]);
        const toggle = await screen.findByRole('switch', { name: 'Czy tworzyć leady automatycznie?' });
        expect(toggle).not.toBeChecked();
    });
});
