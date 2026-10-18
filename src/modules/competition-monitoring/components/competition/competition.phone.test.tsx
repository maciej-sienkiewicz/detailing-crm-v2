// @vitest-environment jsdom
//
// Konkurencja na telefonie: lista profili z podpisami kolumn raz nad listą, bez „kliknij",
// i kalendarz publikacji, który mieści cały okres w szerokości ekranu (rok jako miesiące),
// a wartość kwadratu pokazuje pod siatką po dotknięciu. Komputer zostaje przy tabeli
// i siatce tygodni z dymkami.
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { CompetitionProfile, CompetitionResponse } from '../../types';
import { monthColumns } from '../../utils/competition';
import { ProfilesPanel } from './ProfilesPanel';
import { PublicationCalendar } from './PublicationCalendar';

const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const mondays = (from: string, count: number) => Array.from({ length: count }, (_, i) => {
    const d = new Date(`${from}T00:00:00`);
    d.setDate(d.getDate() + i * 7);
    return iso(d);
});

const profile = (username: string, over: Partial<CompetitionProfile> = {}): CompetitionProfile => ({
    studioProfileId: `s-${username}`, profileId: `p-${username}`, username, isSelf: false,
    apiError: false, followers: 41_000, followersGain: 1184, followersGainPct: 3, growthFrom: null,
    postsInWindow: 54, postsPerWeek: 4.2, reactionsPerPost: 612, weeklyPosts: [], regularityPct: 92,
    formatMix: { photo: 6, reels: 71, carousel: 23 }, activeCampaigns: 2, lastPostAt: null, ...over,
});

const response = (weeks: string[]): CompetitionResponse => ({
    days: weeks.length > 20 ? 365 : 90,
    from: weeks[0],
    to: weeks[weeks.length - 1],
    weeks,
    profiles: [
        profile('detailing_studio_mokotow', { isSelf: true, followers: 3600, weeklyPosts: weeks.map(() => 3) }),
        profile('glosswerk_warszawa', { weeklyPosts: weeks.map((_, i) => i % 5) }),
        profile('autospa_ursynow', { activeCampaigns: null, weeklyPosts: weeks.map(() => 0) }),
    ],
    median: { followers: 5900, followersGainPct: 1.8, postsPerWeek: 2.3, reactionsPerPost: 187, basedOn: 2 },
    events: [],
});

// jsdom nie ma matchMedia; useBreakpoint startuje od szerokości okna, a potem pyta matchMedia.
let desktop = false;
const setWidth = (width: number) => Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
const useDesktop = () => { desktop = true; setWidth(1280); };

beforeEach(() => {
    desktop = false;
    setWidth(390);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: desktop, media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const withTheme = (node: ReactNode) => render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

describe('ProfilesPanel na telefonie', () => {
    const data = response(mondays('2026-07-20', 13));

    it('podpisy kolumn stoją raz, a wiersz-przycisk mówi pełnym zdaniem', () => {
        const onOpen = vi.fn();
        withTheme(<ProfilesPanel data={data} colors={new Map()} onOpenProfile={onOpen} />);

        expect(screen.queryByText(/kliknij profil/)).toBeNull();
        expect(screen.getAllByText('Posty na tydzień')).toHaveLength(1);

        const row = screen.getByRole('button', { name: /^@glosswerk_warszawa/ });
        expect(row.getAttribute('aria-label')).toContain('posty na tydzień 4,2');
        expect(row.getAttribute('aria-label')).toContain('reklamy teraz 2 kampanie');
        fireEvent.click(row);
        expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ username: 'glosswerk_warszawa' }));

        // „?" przy reklamach ma wyjaśnienie pod listą i dla czytnika - dymek palcem się nie otworzy.
        expect(screen.getByRole('button', { name: /^@autospa_ursynow/ }).getAttribute('aria-label'))
            .toContain('reklamy teraz nie wiadomo');
        expect(screen.getByText(/przy reklamach: profil nie ma wskazanej strony na Facebooku/)).toBeTruthy();
        expect(screen.getByText('Mediana konkurencji')).toBeTruthy();
    });

    it('komputer zostaje przy tabeli z podpowiedzią „kliknij"', () => {
        useDesktop();
        withTheme(<ProfilesPanel data={data} colors={new Map()} onOpenProfile={vi.fn()} />);

        expect(screen.getByText('kliknij profil, żeby zobaczyć szczegóły')).toBeTruthy();
        expect(screen.getByText('Profil')).toBeTruthy();
    });
});

describe('PublicationCalendar na telefonie', () => {
    it('90 dni: cały okres w rzędzie, dotknięty tydzień mówi swoją wartość', () => {
        const weeks = mondays('2026-07-20', 13);
        const data = response(weeks);
        withTheme(<PublicationCalendar weeks={weeks} profiles={data.profiles} events={[]} colors={new Map()} />);

        const cells = within(screen.getByRole('group', { name: '@glosswerk_warszawa' })).getAllByRole('button');
        expect(cells).toHaveLength(13);

        fireEvent.click(cells[3]);
        expect(screen.getByText(/10–16 sie:/).closest('p')?.textContent)
            .toBe('@glosswerk_warszawa, 10–16 sie: 3 posty.');
        expect(cells[3].getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(cells[12]);
        expect(screen.getByText(/12–18 paź:/).closest('p')?.textContent).toContain('(tydzień w toku)');
    });

    it('12 miesięcy: kolumna to miesiąc, odcień i podpis to średnia na tydzień', () => {
        const weeks = mondays('2025-10-20', 53);
        const data = response(weeks);
        withTheme(<PublicationCalendar weeks={weeks} profiles={data.profiles} events={[]} colors={new Map()} />);

        const cells = within(screen.getByRole('group', { name: 'Ty' })).getAllByRole('button');
        expect(cells).toHaveLength(monthColumns(weeks).length);
        expect(cells.length).toBeLessThanOrEqual(13);

        fireEvent.click(cells[cells.length - 1]);
        const readout = screen.getByText(/październik 2026:/).closest('p')?.textContent ?? '';
        expect(readout).toContain('średnio 3,0 na tydzień');
        expect(readout).toContain('(miesiąc w toku)');
    });

    it('komputer zostaje przy siatce tygodni z wartością w dymku', () => {
        useDesktop();
        const weeks = mondays('2025-10-20', 53);
        const data = response(weeks);
        withTheme(<PublicationCalendar weeks={weeks} profiles={data.profiles} events={[]} colors={new Map()} />);

        expect(screen.getAllByRole('cell')).toHaveLength(53 * data.profiles.length);
        expect(screen.queryByRole('button')).toBeNull();
    });
});
