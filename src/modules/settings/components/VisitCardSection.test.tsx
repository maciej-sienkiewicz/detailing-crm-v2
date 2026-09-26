// @vitest-environment jsdom
//
// Karta wizyty: przełączniki pokazują się dopiero, gdy znamy stan z serwera.
// Wcześniej błąd wczytania zostawiał kręcące się kółko bez końca.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { VisitCardSection } from './VisitCardSection';
import { visitCardApi } from '@/modules/visit-card/api/visitCardApi';

vi.mock('@/modules/subscription', () => ({
    useFeature: () => ({ enabled: true }),
}));

vi.mock('@/modules/visit-card/api/visitCardApi', () => ({
    visitCardApi: { getSettings: vi.fn(), updateSettings: vi.fn() },
}));

const renderSection = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <MemoryRouter>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <VisitCardSection />
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
};

const settings = (over: Partial<{ enabled: boolean; sendByDefault: boolean }> = {}) =>
    ({ enabled: true, sendByDefault: false, ...over }) as Awaited<ReturnType<typeof visitCardApi.getSettings>>;

beforeEach(() => {
    vi.mocked(visitCardApi.getSettings).mockResolvedValue(settings());
    vi.mocked(visitCardApi.updateSettings).mockImplementation(async p => settings(p));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('VisitCardSection', () => {
    it('renders both settings as accessible switches with the server state', async () => {
        renderSection();
        expect(await screen.findByRole('switch', { name: 'Czy korzystać z Karty Wizyty?' })).toBeChecked();
        expect(screen.getByRole('switch', { name: 'Czy domyślnie wysyłać Kartę Wizyty?' })).not.toBeChecked();
    });

    it('saves a switch and confirms it with a toast', async () => {
        renderSection();
        await userEvent.click(await screen.findByRole('switch', { name: 'Czy domyślnie wysyłać Kartę Wizyty?' }));
        await waitFor(() => expect(visitCardApi.updateSettings).toHaveBeenCalledWith({ sendByDefault: true }));
        expect(await screen.findByText('Zapisano')).toBeInTheDocument();
    });

    it('a failed load shows a retry notice and no switches', async () => {
        vi.mocked(visitCardApi.getSettings).mockRejectedValue(new Error('500'));
        renderSection();
        expect(await screen.findByText('Nie udało się wczytać ustawień karty wizyty')).toBeInTheDocument();
        expect(screen.queryByRole('switch')).not.toBeInTheDocument();

        vi.mocked(visitCardApi.getSettings).mockResolvedValue(settings({ enabled: false }));
        await userEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
        expect(await screen.findByRole('switch', { name: 'Czy korzystać z Karty Wizyty?' })).not.toBeChecked();
    });
});
