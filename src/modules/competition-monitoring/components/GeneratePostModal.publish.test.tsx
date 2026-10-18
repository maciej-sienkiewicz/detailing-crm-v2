// @vitest-environment jsdom
//
// Publikacja z generatora: zdjęcia wizyty, z której otwarto generator, są zaznaczone od
// razu, podpis to wygenerowany tekst, a po publikacji okno prowadzi do posta. Bez
// połączonego konta zostaje kopiowanie i link do „Moje konta".
//
// Realizacja: wizyta i wybrane zdjęcia idą do generatora (fakty i obrazy dla modelu),
// a do publikacji startują te same zdjęcia, które widział model.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { instagramApi } from '../api/instagramApi';
import { accountsApi } from '../api/accountsApi';
import type { InstagramConnection } from '../accountsTypes';
import { GeneratePostModal } from './GeneratePostModal';

vi.mock('../api/instagramApi', () => ({
    instagramApi: {
        listStyleRules: vi.fn(async () => []),
        generatePost: vi.fn(async () => ({
            postId: 'post-1', content: 'Volvo XC60 po powłoce ceramicznej #detailing', iterations: 0,
            verificationPassed: true, failedRules: [], failedRuleDetails: [],
        })),
        rateGeneratedPost: vi.fn(),
    },
}));

vi.mock('../api/accountsApi', async importOriginal => {
    const actual = await importOriginal<typeof import('../api/accountsApi')>();
    return {
        ...actual,
        accountsApi: {
            getConnection: vi.fn(),
            listPublishVisits: vi.fn(async () => [
                {
                    visitId: 'v1', visitNumber: 'W/2026/41', vehicle: 'Volvo XC60', date: '2026-10-14T10:00:00Z',
                    photos: [{ id: 'p1', thumbnailUrl: 'https://x/1.jpg' }, { id: 'p2', thumbnailUrl: 'https://x/2.jpg' }],
                },
            ]),
            publish: vi.fn(async () => ({ mediaId: 'm1', permalink: 'https://www.instagram.com/p/ABC/' })),
        },
    };
});

const connection = (status: InstagramConnection['status']): InstagramConnection => ({
    available: true, status, username: 'studio', pageName: 'Studio', connectedAt: null, lastSyncAt: null,
    lastError: null, messagingEnabled: true, candidates: [],
});

const renderModal = (onClose = vi.fn(), prefill: Parameters<typeof GeneratePostModal>[0]['prefill'] = { topic: 'Powłoka ceramiczna Volvo', visitId: 'v1' }) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <ThemeProvider theme={theme}>
            <QueryClientProvider client={client}>
                <MemoryRouter>
                    <GeneratePostModal onClose={onClose} prefill={prefill} />
                </MemoryRouter>
            </QueryClientProvider>
        </ThemeProvider>,
    );
};

// jsdom nie ma matchMedia; okno pyta o nią przez useBreakpoint (komputer / telefon).
// Szerokość startowa też idzie z okna - useBreakpoint czyta ją przy pierwszym renderze.
const setScreen = (kind: 'desktop' | 'phone') => {
    const desktop = kind === 'desktop';
    vi.stubGlobal('innerWidth', desktop ? 1280 : 400);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: desktop, media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
};

const pressEscape = () => fireEvent.keyDown(document, { key: 'Escape' });

beforeEach(() => setScreen('desktop'));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});

describe('GeneratePostModal: publikacja', () => {
    it('publikuje zdjęcia wizyty z wygenerowanym podpisem i prowadzi do posta', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection('CONNECTED'));
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: /Generuj post/ }));
        const publish = await screen.findByRole('button', { name: /Opublikuj/ });
        await waitFor(() => expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2));

        fireEvent.click(publish);

        await waitFor(() => expect(accountsApi.publish).toHaveBeenCalledWith({
            caption: 'Volvo XC60 po powłoce ceramicznej #detailing',
            photoIds: ['p1', 'p2'],
        }));
        const link = await screen.findByRole('link', { name: /Zobacz post/ });
        expect(link.getAttribute('href')).toBe('https://www.instagram.com/p/ABC/');
        expect(instagramApi.generatePost).toHaveBeenCalledTimes(1);
    });

    it('bez połączonego konta nie ma publikacji, jest droga do połączenia', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection('NOT_CONNECTED'));
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: /Generuj post/ }));
        await screen.findByRole('link', { name: /Połącz konto Instagram/ });
        expect(screen.queryByRole('button', { name: /Opublikuj/ })).toBeNull();
        expect(accountsApi.publish).not.toHaveBeenCalled();
    });

    it('wizyta i zdjęcia wybrane dla AI idą do generatora, publikacja startuje od nich', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection('CONNECTED'));
        renderModal();

        // Oba zdjęcia wizyty są zaznaczone dla AI; drugie odznaczamy przed generowaniem.
        await waitFor(() => expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2));
        fireEvent.click(screen.getByRole('button', { name: /Zdjęcie 2 dla AI/ }));
        fireEvent.click(screen.getByRole('button', { name: /Generuj post/ }));

        await waitFor(() => expect(instagramApi.generatePost).toHaveBeenCalledWith(
            expect.objectContaining({ visitId: 'v1', photoIds: ['p1'] }),
        ));
        fireEvent.click(await screen.findByRole('button', { name: /Opublikuj/ }));
        await waitFor(() => expect(accountsApi.publish).toHaveBeenCalledWith(
            expect.objectContaining({ photoIds: ['p1'] }),
        ));
    });

    it('„Wybierz inną realizację" zaczyna bez wizyty, a wybór ustawia temat', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection('NOT_CONNECTED'));
        renderModal(vi.fn(), { pickVisit: true });

        const select = await screen.findByRole('combobox', { name: /Wizyta, której dotyczy post/ });
        expect((select as HTMLSelectElement).value).toBe('');
        expect(screen.getByText('Wybierz realizację')).toBeTruthy();

        fireEvent.change(select, { target: { value: 'v1' } });
        expect((screen.getByLabelText(/Temat posta/) as HTMLInputElement).value).toBe('Realizacja: Volvo XC60');
        fireEvent.click(screen.getByRole('button', { name: /Generuj post/ }));
        await waitFor(() => expect(instagramApi.generatePost).toHaveBeenCalledWith(
            expect.objectContaining({ visitId: 'v1', photoIds: ['p1', 'p2'] }),
        ));
    });
});

// Telefon: systemowe „Wstecz" w aplikacji przychodzi jako Escape, ale tylko do okna z rolą
// dialogu (installNativeShell). Dawniej generator jej nie miał - drugie „Wstecz" cofało stronę
// i gotowy post znikał razem z oknem.
describe('GeneratePostModal: zamykanie na telefonie i na komputerze', () => {
    it('jest oknem modalnym, więc „Wstecz" w aplikacji trafia do niego, a nie do historii', () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection('NOT_CONNECTED'));
        renderModal();

        const dialog = screen.getByRole('dialog', { name: 'Generator postów na Instagram' });
        expect(dialog.getAttribute('aria-modal')).toBe('true');
    });

    it('na telefonie gotowy post nie znika po cichu: najpierw pytanie, drugie „Wstecz" zostaje przy poście', async () => {
        setScreen('phone');
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection('NOT_CONNECTED'));
        const onClose = vi.fn();
        renderModal(onClose);

        fireEvent.click(screen.getByRole('button', { name: /Generuj post/ }));
        await screen.findByRole('button', { name: /Kopiuj post/ });

        pressEscape();
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('alertdialog', { name: 'Zamknąć generator?' })).toBeTruthy();

        pressEscape();
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(onClose).not.toHaveBeenCalled();

        pressEscape();
        const question = screen.getByRole('alertdialog', { name: 'Zamknąć generator?' });
        fireEvent.click(within(question).getByRole('button', { name: 'Zamknij' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('na telefonie skopiowany post można zamknąć bez pytania - jest już u właściciela', async () => {
        setScreen('phone');
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(async () => {}) } });
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection('NOT_CONNECTED'));
        const onClose = vi.fn();
        renderModal(onClose);

        fireEvent.click(screen.getByRole('button', { name: /Generuj post/ }));
        fireEvent.click(await screen.findByRole('button', { name: /Kopiuj post/ }));
        await screen.findByRole('button', { name: /Skopiowano/ });

        pressEscape();
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('na komputerze Escape zamyka od razu, także z gotowym postem', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection('NOT_CONNECTED'));
        const onClose = vi.fn();
        renderModal(onClose);

        fireEvent.click(screen.getByRole('button', { name: /Generuj post/ }));
        await screen.findByRole('button', { name: /Kopiuj post/ });

        pressEscape();
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('na telefonie temat nie dostaje fokusu przy otwarciu (klawiatura zasłaniała formularz), na komputerze dostaje', async () => {
        setScreen('phone');
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection('NOT_CONNECTED'));
        renderModal();
        await new Promise(resolve => setTimeout(resolve, 150));
        expect(document.activeElement).not.toBe(screen.getByLabelText(/Temat posta/));

        cleanup();
        setScreen('desktop');
        renderModal();
        await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Temat posta/)));
    });
});
