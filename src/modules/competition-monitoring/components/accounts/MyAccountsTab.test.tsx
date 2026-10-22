// @vitest-environment jsdom
//
// Zakładka „Moje konta": bez połączenia jedynym wypełnionym przyciskiem jest „Połącz
// Instagram" (Google zostaje przy odcieniu), po połączeniu wypełnienie może przejść
// na wizytówkę Google - nigdy dwa naraz (CLAUDE.md §2). Wynik powrotu z logowania
// pokazuje się raz i znika z adresu. Na telefonie zakładka układa się według tego,
// kto czeka na odpowiedź: wiadomości i opinie nad statystykami.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { accountsApi } from '../../api/accountsApi';
import type { DmThread, GoogleBusiness, GoogleReview, InstagramConnection, MyInstagram } from '../../accountsTypes';
import { MyAccountsTab } from './MyAccountsTab';

// Preferencje powiadomień mają własne testy i własne API - tu sprawdzamy same konta.
vi.mock('@/common/components/notifications', () => ({ MarketNotificationPreferences: () => null }));

vi.mock('../../api/accountsApi', async importOriginal => {
    const actual = await importOriginal<typeof import('../../api/accountsApi')>();
    return {
        ...actual,
        accountsApi: {
            getConnection: vi.fn(),
            getMine: vi.fn(),
            listThreads: vi.fn(async () => []),
            getSettings: vi.fn(async () => ({ weeklyPostGoal: 3 })),
            getGoogle: vi.fn(),
            startConnection: vi.fn(),
        },
    };
});

const connection = (patch: Partial<InstagramConnection> = {}): InstagramConnection => ({
    available: true, status: 'NOT_CONNECTED', username: null, pageName: null, connectedAt: null,
    lastSyncAt: null, lastError: null, messagingEnabled: false, candidates: [], ...patch,
});

const google = (patch: Partial<GoogleBusiness> = {}): GoogleBusiness => ({
    available: true, status: 'NOT_CONNECTED', locationTitle: null, locationAddress: null, lastSyncAt: null,
    lastError: null, candidates: [], averageRating: null, totalReviews: null, last30: null, previous30: null,
    dataUntil: null, reviews: [], unansweredReviews: 0, ...patch,
});

const renderTab = (url = '/instagram?view=mine') => {
    const router = createMemoryRouter([{ path: '/instagram', element: <MyAccountsTab /> }], { initialEntries: [url] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <ThemeProvider theme={theme}>
            <QueryClientProvider client={client}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        </ThemeProvider>,
    );
    return router;
};

const thread = (patch: Partial<DmThread> = {}): DmThread => ({
    id: 't1', username: 'klient', displayName: 'Michał Kwiatkowski', leadId: 'l1', leadStatus: 'NEW',
    lastMessageAt: new Date().toISOString(), lastSnippet: 'Ile kosztuje korekta?', awaitingReply: true, unreadCount: 1,
    replyDeadline: null, ...patch,
});

const review = (patch: Partial<GoogleReview> = {}): GoogleReview => ({
    id: 'r1', reviewerName: 'Tomasz', starRating: 2, comment: 'Auto odebrane dzień później.',
    createdAt: '2026-10-15T10:00:00Z', replyComment: null, replyAt: null, ...patch,
});

const mine = (): MyInstagram => ({
    connection: connection({ status: 'CONNECTED' }), followers: 3850, last30: null, previous30: null,
    bestHours: [], cities: [], topPosts: [], syncedAt: null,
});

const filled = () => document.querySelectorAll('[data-variant="primary"], [data-variant="success"]');

/** Kolejność paneli w DOM: true, gdy `first` stoi przed `second`. */
const before = (first: Element, second: Element) =>
    Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

// jsdom nie ma matchMedia; zakładka pyta o nią przez useBreakpoint (komputer / telefon).
let desktop = true;

beforeEach(() => {
    desktop = true;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: desktop, media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
    vi.mocked(accountsApi.getGoogle).mockResolvedValue(google());
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('MyAccountsTab', () => {
    it('bez połączenia jedynym wypełnieniem jest „Połącz Instagram"', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection());

        renderTab();

        const connect = await screen.findByRole('button', { name: /Połącz Instagram/ });
        await screen.findByRole('button', { name: /Połącz wizytówkę Google/ });
        expect(connect.getAttribute('data-variant')).toBe('primary');
        expect(screen.getByRole('button', { name: /Połącz wizytówkę Google/ }).getAttribute('data-variant')).toBe('tinted');
        expect(filled()).toHaveLength(1);
    });

    it('po połączeniu Instagrama wypełnienie przechodzi na wizytówkę Google', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection({
            status: 'CONNECTED', username: 'studio', pageName: 'Studio', messagingEnabled: true,
        }));
        vi.mocked(accountsApi.getMine).mockResolvedValue({
            connection: connection({ status: 'CONNECTED' }), followers: 3850, last30: null, previous30: null,
            bestHours: [], cities: [], topPosts: [], syncedAt: null,
        });

        renderTab();

        const connectGoogle = await screen.findByRole('button', { name: /Połącz wizytówkę Google/ });
        await screen.findByText('@studio');
        expect(connectGoogle.getAttribute('data-variant')).toBe('primary');
        expect(filled()).toHaveLength(1);
    });

    it('serwer bez aplikacji Meta nie pokazuje przycisku, tylko informację', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection({ available: false }));

        renderTab();

        await screen.findByText('Łączenie z Instagramem jeszcze nieaktywne');
        expect(screen.queryByRole('button', { name: /Połącz Instagram/ })).toBeNull();
    });

    it('wynik logowania pokazuje się raz i znika z adresu', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection());

        const router = renderTab('/instagram?view=mine&connection=error&reason=no-account');

        await screen.findByText('Nie udało się połączyć Instagrama');
        await waitFor(() => expect(router.state.location.search).toBe('?view=mine'));
        expect(screen.getByText(/firmowym kontem Instagram/)).toBeTruthy();
    });

    describe('na telefonie', () => {
        const connectedEverywhere = (threads: DmThread[], reviews: GoogleReview[]) => {
            desktop = false;
            vi.mocked(accountsApi.getConnection).mockResolvedValue(connection({
                status: 'CONNECTED', username: 'studio', pageName: 'Studio', messagingEnabled: true,
            }));
            vi.mocked(accountsApi.getMine).mockResolvedValue(mine());
            vi.mocked(accountsApi.listThreads).mockResolvedValue(threads);
            vi.mocked(accountsApi.getGoogle).mockResolvedValue(google({
                status: 'CONNECTED', locationTitle: 'Studio Mokotów', reviews,
                unansweredReviews: reviews.filter(r => r.replyComment === null).length,
            }));
        };

        it('kto czeka na odpowiedź, stoi nad statystykami Instagrama', async () => {
            connectedEverywhere(
                [thread(), thread({ id: 't2', displayName: 'Katarzyna Lis', awaitingReply: false })],
                [review(), review({ id: 'r2', reviewerName: 'Ewa', comment: 'Reflektory jak nowe.', replyComment: 'Dziękujemy!' })],
            );

            renderTab();

            const messages = await screen.findByRole('region', { name: 'Wiadomości z Instagrama' });
            const reviews = await screen.findByRole('region', { name: 'Opinie w Google' });
            const instagram = screen.getByRole('region', { name: 'Konto Instagram' });
            expect(before(messages, reviews)).toBe(true);
            expect(before(reviews, instagram)).toBe(true);
            await screen.findByText('Michał Kwiatkowski');
            await screen.findByText('Auto odebrane dzień później.');
        });

        it('odpowiedziane opinie i rozmowy bez czekającego klienta czekają za „Pokaż"', async () => {
            connectedEverywhere(
                [thread(), thread({ id: 't2', displayName: 'Katarzyna Lis', awaitingReply: false })],
                [review(), review({ id: 'r2', reviewerName: 'Ewa', comment: 'Reflektory jak nowe.', replyComment: 'Dziękujemy!' })],
            );

            renderTab();

            await screen.findByText('Michał Kwiatkowski');
            expect(screen.queryByText('Katarzyna Lis')).toBeNull();
            fireEvent.click(screen.getByRole('button', { name: /Pokaż pozostałe rozmowy \(1\)/ }));
            expect(screen.getByText('Katarzyna Lis')).toBeTruthy();

            await screen.findByText('Auto odebrane dzień później.');
            expect(screen.queryByText('Reflektory jak nowe.')).toBeNull();
            fireEvent.click(screen.getByRole('button', { name: /Pokaż opinie z odpowiedzią \(1\)/ }));
            expect(screen.getByText('Reflektory jak nowe.')).toBeTruthy();
        });

        it('bez czekających wiadomości i opinii statystyki wracają na górę', async () => {
            connectedEverywhere(
                [thread({ awaitingReply: false })],
                [review({ replyComment: 'Dziękujemy!' })],
            );

            renderTab();

            const instagram = await screen.findByRole('region', { name: 'Konto Instagram' });
            const messages = await screen.findByRole('region', { name: 'Wiadomości z Instagrama' });
            await screen.findByText('Auto odebrane dzień później.');
            expect(screen.queryByRole('region', { name: 'Opinie w Google' })).toBeNull();
            expect(before(instagram, messages)).toBe(true);
        });

        it('bez połączeń nadal jedynym wypełnieniem jest „Połącz Instagram"', async () => {
            desktop = false;
            vi.mocked(accountsApi.getConnection).mockResolvedValue(connection());

            renderTab();

            const connect = await screen.findByRole('button', { name: /Połącz Instagram/ });
            await screen.findByRole('button', { name: /Połącz wizytówkę Google/ });
            expect(connect.getAttribute('data-variant')).toBe('primary');
            expect(filled()).toHaveLength(1);
        });
    });

    describe('okno „Przechodzę do Facebooka"', () => {
        const originalLocation = window.location;
        const assign = vi.fn();

        beforeEach(() => {
            // jsdom nie nawiguje - podmieniamy samo przejście, reszta adresu zostaje.
            Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, assign } });
        });
        afterEach(() => {
            Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
            document.documentElement.removeAttribute('style');
            document.body.removeAttribute('style');
        });

        it('stoi od kliknięcia do opuszczenia strony i połyka klawisze', async () => {
            vi.mocked(accountsApi.getConnection).mockResolvedValue(connection());
            let resolveUrl: (url: string) => void = () => {};
            vi.mocked(accountsApi.startConnection).mockReturnValue(new Promise(resolve => { resolveUrl = resolve; }));
            renderTab();

            fireEvent.click(await screen.findByRole('button', { name: /Połącz Instagram/ }));

            // Backend jeszcze nie oddał adresu - okno już stoi.
            const dialog = await screen.findByRole('alertdialog', { name: 'Przechodzę do Facebooka' });
            expect(dialog.getAttribute('aria-busy')).toBe('true');

            const key = new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true });
            window.dispatchEvent(key);
            expect(key.defaultPrevented).toBe(true);

            // Adres przyszedł, przeglądarka ładuje Meta - okno NIE znika, choć żądanie się skończyło.
            resolveUrl('https://www.facebook.com/dialog/oauth?x=1');
            await waitFor(() => expect(assign).toHaveBeenCalledWith('https://www.facebook.com/dialog/oauth?x=1'));
            expect(screen.getByRole('alertdialog', { name: 'Przechodzę do Facebooka' })).toBeTruthy();
        });

        it('znika, gdy żądanie się nie uda, i oddaje klawiaturę', async () => {
            vi.mocked(accountsApi.getConnection).mockResolvedValue(connection());
            vi.mocked(accountsApi.startConnection).mockRejectedValue(new Error('500'));
            renderTab();

            fireEvent.click(await screen.findByRole('button', { name: /Połącz Instagram/ }));

            await waitFor(() => expect(accountsApi.startConnection).toHaveBeenCalled());
            await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
            const key = new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true });
            window.dispatchEvent(key);
            expect(key.defaultPrevented).toBe(false);
            expect(assign).not.toHaveBeenCalled();
        });
    });
});
