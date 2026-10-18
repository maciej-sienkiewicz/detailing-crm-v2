// @vitest-environment jsdom
//
// „Reklamodawcy w okolicy" na telefonie: nazwa firmy w całości, liczby słowami zamiast
// kolumn, rzadkie akcje w menu ⋯. Wcześniej lista kart z komputera zostawiała na nazwę
// 46 px i z „Perłowy Połysk…" zostawało „P". Komputer zostaje przy tabeli.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { instagramApi } from '../api/instagramApi';
import type { AdvertiserRow, AreaResults, AreaSettings } from '../types';
import { AreaSection } from './AreaSection';

vi.mock('../api/instagramApi', () => ({
    instagramApi: {
        getAreaSettings: vi.fn(),
        getAreaResults: vi.fn(),
        listProfiles: vi.fn(async () => []),
        blockAdvertiser: vi.fn(async () => ({})),
        followAdvertiser: vi.fn(async () => ({ username: 'perlowy_polysk_studio' })),
        acknowledgeAreaNovelty: vi.fn(async () => null),
        getPhraseCatalog: vi.fn(async () => []),
        listBlockedAdvertisers: vi.fn(async () => []),
    },
}));

const LONG_NAME = 'Perłowy Połysk – Studio Detailingu i Ochrony Lakieru Sp. z o.o.';

const advertiser = (patch: Partial<AdvertiserRow> = {}): AdvertiserRow => ({
    pageId: 'p1', companyName: LONG_NAME, activeAds: 1, activeCampaigns: 2, reach: 228800,
    adLibraryUrl: 'https://www.facebook.com/ads/library/?view_all_page_id=p1', sampleSnapshotUrl: null,
    instagram: 'perlowy_polysk_studio', newCampaigns: 0, newAdvertiser: true, latestCampaignStart: '2026-10-13',
    relevance: 'SERVICE', ...patch,
});

const settings: AreaSettings = {
    locations: ['Warszawa', 'Konstancin-Jeziorna'], matchMode: 'INCLUDE_BROADER', excludedPhraseIds: [],
    trackedPhraseCount: 42, noveltyAckedThrough: null, updatedAt: null,
};

const results = (advertisers: AdvertiserRow[]): AreaResults => ({
    phrases: [], locations: settings.locations, matchMode: 'INCLUDE_BROADER', configured: true,
    generatedAt: '2026-10-17T10:00:00Z', advertisers, page: 0, pageSize: 10,
    totalAdvertisers: advertisers.length, totalActiveAds: 3, hiddenAdvertisers: 0, newAdvertisers: 0,
    newCampaigns: 0, newWindowDays: 14, phraseStatuses: [],
});

// jsdom nie ma matchMedia; sekcja pyta o nią przez useBreakpoint (komputer / telefon).
// Szerokość okna też, bo od niej hook startuje przed pierwszym efektem.
let desktop = false;
const setWidth = (width: number) => Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });

beforeEach(() => {
    desktop = false;
    setWidth(390);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: desktop, media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
    vi.mocked(instagramApi.getAreaSettings).mockResolvedValue(settings);
    vi.mocked(instagramApi.getAreaResults).mockResolvedValue(results([
        advertiser(),
        advertiser({ pageId: 'p2', companyName: 'Myjnia Ręczna Bąkowa 24h', activeCampaigns: 1, reach: null, instagram: null, newAdvertiser: false }),
    ]));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const renderSection = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <ThemeProvider theme={theme}>
            <QueryClientProvider client={client}>
                <ToastProvider>
                    <AreaSection />
                </ToastProvider>
            </QueryClientProvider>
        </ThemeProvider>,
    );
};

describe('AreaSection na telefonie', () => {
    it('pokazuje pełną nazwę i liczby słowami, bez nagłówka kolumn', async () => {
        renderSection();

        const row = (await screen.findByText(LONG_NAME)).closest('li')!;
        expect(row).not.toBeNull();
        expect(row.textContent).toContain('2 kampanie');
        expect(row.textContent).toContain('zasięg 228 800');
        expect(within(row).getByText('Nowa firma')).toBeTruthy();
        expect(within(row).getByText('od 13 paź')).toBeTruthy();

        // Brak pomiaru zasięgu: jeden zapis braku danych w module, półpauza.
        const quiet = screen.getByText('Myjnia Ręczna Bąkowa 24h').closest('li')!;
        expect(quiet.textContent).toContain('1 kampania');
        expect(quiet.textContent).toContain('zasięg —');

        expect(screen.queryByRole('columnheader')).toBeNull();
        expect(screen.queryByText('Kampanie')).toBeNull();
    });

    it('akcje wiersza siedzą w menu ⋯ z podpisami, ukrycie trafia do serwera', async () => {
        renderSection();

        fireEvent.click(await screen.findByRole('button', { name: `Więcej: ${LONG_NAME}` }));
        const menu = screen.getByRole('menu');
        expect(within(menu).getByRole('menuitem', { name: 'Reklamy w Bibliotece Meta' })).toBeTruthy();

        fireEvent.click(within(menu).getByRole('menuitem', { name: 'Ukryj tę firmę' }));
        await vi.waitFor(() => expect(instagramApi.blockAdvertiser).toHaveBeenCalledWith('p1', LONG_NAME));
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('„Obserwuj" jest przyciskiem z nazwą profilu', async () => {
        renderSection();

        fireEvent.click(await screen.findByRole('button', { name: 'Obserwuj @perlowy_polysk_studio' }));
        await vi.waitFor(() => expect(instagramApi.followAdvertiser).toHaveBeenCalledWith('p1'));
    });

    it('liczba fraz stoi w osobnej linii, a łącznik w nazwie miejscowości nie łamie wiersza', async () => {
        renderSection();

        expect(await screen.findByText('Warszawa, Konstancin‑Jeziorna')).toBeTruthy();
        expect(screen.getByText('42').parentElement?.textContent).toBe('42 frazy z katalogu');
    });
});

describe('AreaSection na komputerze', () => {
    it('zostaje przy tabeli z nagłówkami kolumn i ikonami akcji', async () => {
        desktop = true;
        setWidth(1280);
        renderSection();

        expect(await screen.findAllByRole('columnheader')).toHaveLength(4);
        expect(screen.queryByRole('button', { name: `Więcej: ${LONG_NAME}` })).toBeNull();
        expect(screen.getAllByRole('button', { name: `Ukryj firmę ${LONG_NAME}` }).length).toBeGreaterThan(0);
    });
});
