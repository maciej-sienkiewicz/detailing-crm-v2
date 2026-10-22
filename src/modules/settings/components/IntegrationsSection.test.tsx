// @vitest-environment jsdom
//
// Ustawienia → Integracje → Odłącz: ścieżkę podaje strona /usuwanie-danych, wpisana w panelu
// Meta jako instrukcja usunięcia danych. Recenzent App Review przechodzi ją dosłownie, więc
// przycisk ma się nazywać „Odłącz" i być przy każdym połączonym koncie.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { integrationsApi, type Integrations } from '../api/integrationsApi';
import { IntegrationsSection } from './IntegrationsSection';

vi.mock('../api/integrationsApi', () => ({
    integrationsApi: { list: vi.fn(), disconnect: vi.fn() },
}));

const NOT_CONNECTED = { status: 'NOT_CONNECTED', account: null, detail: null, connectedAt: null } as const;

const CONNECTED: Integrations = {
    instagram: { status: 'CONNECTED', account: 'pro_garage_performance', detail: 'Pro Garage', connectedAt: '2026-10-12T08:00:00Z' },
    google: { status: 'ERROR', account: 'Pro Garage Detailing', detail: 'Poznańska 1, Poznań', connectedAt: null },
};

const renderSection = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider theme={theme}>
            <MemoryRouter>
                <IntegrationsSection />
            </MemoryRouter>
        </ThemeProvider>
    </QueryClientProvider>,
);

/** ConfirmationModal nie ma roli dialog - okno to najbliższy przodek tytułu, który ma „Zostaw". */
const confirmation = async (title: string) => {
    let node: HTMLElement | null = await screen.findByText(title);
    while (node && !within(node).queryByRole('button', { name: 'Zostaw' })) node = node.parentElement;
    return node!;
};

beforeEach(() => {
    vi.mocked(integrationsApi.list).mockReset();
    vi.mocked(integrationsApi.disconnect).mockReset().mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('IntegrationsSection', () => {
    it('połączone konta: nazwa, doprecyzowanie, stan i „Odłącz" także przy przerwanym połączeniu', async () => {
        vi.mocked(integrationsApi.list).mockResolvedValue(CONNECTED);
        renderSection();

        const instagram = await screen.findByRole('region', { name: 'Instagram' });
        expect(within(instagram).getByText('@pro_garage_performance')).toBeTruthy();
        expect(within(instagram).getByText('Strona na Facebooku: Pro Garage')).toBeTruthy();
        expect(within(instagram).getByText('Połączono')).toBeTruthy();
        expect(within(instagram).getByRole('button', { name: 'Odłącz' })).toBeTruthy();

        // Konto, któremu dostawca cofnął dostęp, też musi dać się odłączyć - token wciąż leży w CRM.
        const google = screen.getByRole('region', { name: 'Wizytówka Google' });
        expect(within(google).getByText('Połączenie przerwane')).toBeTruthy();
        expect(within(google).getByRole('button', { name: 'Odłącz' })).toBeTruthy();
    });

    it('odłączenie po potwierdzeniu, potem karta pokazuje „Nie połączono"', async () => {
        vi.mocked(integrationsApi.list)
            .mockResolvedValueOnce(CONNECTED)
            .mockResolvedValue({ ...CONNECTED, instagram: NOT_CONNECTED });
        renderSection();

        const instagram = await screen.findByRole('region', { name: 'Instagram' });
        await userEvent.click(within(instagram).getByRole('button', { name: 'Odłącz' }));

        const dialog = await confirmation('Odłączyć Instagram?');
        expect(within(dialog).getByText(/także po stronie Meta/)).toBeTruthy();
        expect(integrationsApi.disconnect).not.toHaveBeenCalled();
        await userEvent.click(within(dialog).getByRole('button', { name: 'Odłącz' }));

        expect(integrationsApi.disconnect).toHaveBeenCalledWith('instagram');
        expect(await within(instagram).findByText('Nie połączono')).toBeTruthy();
        expect(within(instagram).queryByRole('button', { name: 'Odłącz' })).toBeNull();
    });

    it('„Zostaw" w potwierdzeniu niczego nie odłącza', async () => {
        vi.mocked(integrationsApi.list).mockResolvedValue(CONNECTED);
        renderSection();

        const google = await screen.findByRole('region', { name: 'Wizytówka Google' });
        await userEvent.click(within(google).getByRole('button', { name: 'Odłącz' }));
        const dialog = await confirmation('Odłączyć wizytówkę Google?');
        expect(within(dialog).getByText(/usunie pobrane opinie oraz statystyki/)).toBeTruthy();
        await userEvent.click(within(dialog).getByRole('button', { name: 'Zostaw' }));

        expect(screen.queryByText('Odłączyć wizytówkę Google?')).toBeNull();
        expect(integrationsApi.disconnect).not.toHaveBeenCalled();
    });

    it('bez połączeń: bez „Odłącz", z drogą do modułu i odnośnikiem do strony o usuwaniu danych', async () => {
        vi.mocked(integrationsApi.list).mockResolvedValue({ instagram: NOT_CONNECTED, google: NOT_CONNECTED });
        renderSection();

        const instagram = await screen.findByRole('region', { name: 'Instagram' });
        expect(within(instagram).getByText('Nie połączono')).toBeTruthy();
        expect(within(instagram).getByText(/zakładce „Moje konta”/)).toBeTruthy();
        expect(within(instagram).getByRole('button', { name: 'Przejdź do modułu' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Odłącz' })).toBeNull();

        expect(screen.getByRole('link', { name: 'Usuwanie danych' }).getAttribute('href')).toBe('/usuwanie-danych');
    });
});
