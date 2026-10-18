// @vitest-environment jsdom
//
// Reklamy na telefonie: odmiana „2 profile", przyciski otwierające okna w aplikacji
// (strzałka, nie ikona wyjścia), czytelne miesiące i ich wartości po dotknięciu.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { AdBar, AdCalendar, AdCalendarRow } from '../types';
import { AdsTabMobile } from './AdsTabMobile';

vi.mock('../hooks/useProfileColors', () => ({ useProfileColors: () => new Map<string, string>() }));

vi.mock('./LinkFacebookPageModal', () => ({
    LinkFacebookPageModal: ({ username }: { username: string }) => <div role="dialog">Strona dla @{username}</div>,
}));

const ad = (adId: string, title: string | null, start: string, stop: string | null, days: number): AdBar => ({
    adId, title, start, stop, days, reach: 1200, platforms: ['FACEBOOK'], lane: 0,
});

const row = (username: string, ads: AdBar[], extra: Partial<AdCalendarRow> = {}): AdCalendarRow => ({
    profileId: username, username, isSelf: false, facebookPageId: '123', campaigns: ads.length,
    activeNow: ads.filter(a => !a.stop).length, sponsoredDays: ads.reduce((s, a) => s + a.days, 0),
    reachTotal: 1200 * ads.length, lanes: 1, ads, ...extra,
});

const calendar = (patch: Partial<AdCalendar> = {}): AdCalendar => ({
    year: 2026, today: '2026-10-17', activeToday: 1, configured: true, unlinked: [],
    rows: [
        row('glosswerk_warszawa', [
            ad('live', 'PPF Full Front od 4 990 zł brutto', '2026-09-22', null, 26),
            ad('march', 'Wiosenne mycie', '2026-03-21', '2026-03-25', 5),
        ]),
        row('nanoshine_praga', []),
    ],
    ...patch,
});

const renderTab = (data: AdCalendar, onOpenAd = vi.fn()) => {
    const view = render(
        <ThemeProvider theme={theme}>
            <AdsTabMobile calendar={data} onOpenAd={onOpenAd} showArea={false} />
        </ThemeProvider>
    );
    return { ...view, onOpenAd };
};

afterEach(cleanup);

describe('Reklamy na telefonie', () => {
    it('dwa profile bez strony to „2 profile", nie „2 profili"', () => {
        renderTab(calendar({
            rows: [],
            unlinked: [
                { profileId: 'a', username: 'glosswerk_warszawa' },
                { profileId: 'b', username: 'studio_detailingu_tarchomin' },
            ],
        }));
        expect(screen.getByText('2 profile bez strony na Facebooku')).toBeTruthy();
        expect(screen.queryByText(/profili/)).toBeNull();
    });

    it('pięć profili bez strony leży zwiniętych pod jednym przyciskiem', () => {
        renderTab(calendar({
            unlinked: ['a', 'b', 'c', 'd', 'e'].map(id => ({ profileId: id, username: `profil_${id}` })),
        }));
        expect(screen.getByText('5 profili bez strony na Facebooku')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /dla @profil_a/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Pokaż 5 profili' }));
        expect(screen.getByRole('button', { name: /dla @profil_e/ })).toBeTruthy();
    });

    it('profil bez strony otwiera okno wskazania strony w aplikacji', () => {
        const { container } = renderTab(calendar({ unlinked: [{ profileId: 'a', username: 'autospa_ursynow' }] }));
        fireEvent.click(screen.getByRole('button', { name: 'Wskaż stronę na Facebooku dla @autospa_ursynow' }));
        expect(screen.getByRole('dialog').textContent).toContain('@autospa_ursynow');
        // Ikona „wyjścia z aplikacji" przy przycisku, który otwiera okno w aplikacji, to fałszywa obietnica.
        expect(container.querySelector('.lucide-external-link')).toBeNull();
    });

    it('nowe studio bez podpiętych stron widzi, co ta zakładka pokaże', () => {
        renderTab(calendar({ rows: [], unlinked: [{ profileId: 'a', username: 'autospa_ursynow' }] }));
        expect(screen.getByText('Tu zobaczysz reklamy konkurencji')).toBeTruthy();
    });

    it('trwająca reklama jest wierszem, który otwiera jej szczegóły', () => {
        const { onOpenAd } = renderTab(calendar());
        expect(screen.getByText('1 aktywna reklama')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /PPF Full Front/ }));
        expect(onOpenAd).toHaveBeenCalledWith('live');
    });

    it('podsumowanie reklamodawcy to jedno zdanie, a profil bez reklam mówi to zwykłym tekstem', () => {
        renderTab(calendar());
        const panel = screen.getByRole('region', { name: '@glosswerk_warszawa' });
        expect(panel.textContent).toContain('2 kampanie, 31 dni reklam');
        expect(screen.getByText('Bez reklam w 2026')).toBeTruthy();
    });

    it('zmiana strony FB to przycisk z nazwą, nie podkreślony napis', () => {
        renderTab(calendar());
        expect(screen.getAllByRole('button', { name: 'Zmień stronę na Facebooku' })).toHaveLength(2);
        expect(screen.queryByText('strona FB')).toBeNull();
    });

    it('miesiące mają trzyliterowe skróty, a bieżący jest oznaczony', () => {
        renderTab(calendar());
        const chart = screen.getByRole('group', { name: /Dni reklam @glosswerk_warszawa/ });
        const labels = within(chart).getAllByRole('button').map(button => button.textContent);
        expect(labels).toEqual(['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']);
        expect(within(chart).getByRole('button', { name: /^Październik/ }).getAttribute('aria-current')).toBe('date');
    });

    it('dotknięcie miesiąca pokazuje jego dni i kampanie', () => {
        const { onOpenAd } = renderTab(calendar());
        fireEvent.click(screen.getByRole('button', { name: /^Marzec: 5 dni reklam/ }));
        expect(screen.getByText('Marzec 2026')).toBeTruthy();
        expect(screen.getByText(/5 dni reklam, 1 kampania/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Wiosenne mycie/ }));
        expect(onOpenAd).toHaveBeenCalledWith('march');
    });
});
