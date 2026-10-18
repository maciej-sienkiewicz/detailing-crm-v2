import { describe, expect, it } from 'vitest';
import {
    calendarLevel,
    formatPerWeek,
    formatSignedCount,
    formatSignedPct,
    growthRanking,
    growthSinceLabel,
    medianMarker,
    monthColumns,
    monthLevel,
    splitProfiles,
    versusMedian,
    weekRangeLabel,
} from './competition';
import type { CompetitionProfile } from '../types';

const profile = (username: string, over: Partial<CompetitionProfile> = {}): CompetitionProfile => ({
    studioProfileId: `s-${username}`, profileId: `p-${username}`, username, isSelf: false,
    apiError: false, followers: 1000, followersGain: 10, followersGainPct: 1, growthFrom: null,
    postsInWindow: 10, postsPerWeek: 1, reactionsPerPost: 100, weeklyPosts: [], regularityPct: 80,
    formatMix: { photo: 50, reels: 30, carousel: 20 }, activeCampaigns: 0, lastPostAt: null, ...over,
});

describe('formatery', () => {
    it('procent ze znakiem i polskim przecinkiem', () => {
        expect(formatSignedPct(3.84)).toBe('+3,8%');
        expect(formatSignedPct(-0.42)).toBe('−0,4%');
        expect(formatSignedPct(0.02)).toBe('0%');
        expect(formatSignedPct(null)).toBeNull();
    });

    it('liczby i posty na tydzień', () => {
        expect(formatSignedCount(46)).toBe('+46');
        expect(formatSignedCount(-12)).toBe('−12');
        expect(formatPerWeek(1)).toBe('1,0');
        expect(formatPerWeek(1.46)).toBe('1,5');
    });

    it('kalendarz ma cztery stopnie', () => {
        expect([0, 1, 2, 3, 7].map(calendarLevel)).toEqual([0, 1, 2, 3, 3]);
    });
});

describe('ranking przyrostu', () => {
    it('Ty i wszyscy konkurenci, od największego procentu, bez profili bez pomiaru', () => {
        const rows = growthRanking([
            profile('a', { followersGainPct: 2 }),
            profile('ja', { isSelf: true, followersGainPct: 3.8 }),
            profile('duzy', { followersGainPct: 20 }),
            profile('nowy', { followersGainPct: null }),
            profile('spada', { followersGainPct: -1 }),
        ]);
        expect(rows.map(r => r.profile.username)).toEqual(['duzy', 'ja', 'a', 'spada']);
        expect(rows[0].width).toBe(100);
        expect(rows[3].negative).toBe(true);
    });

    it('kreska mediany na tej samej skali', () => {
        const rows = growthRanking([profile('a', { followersGainPct: 4 }), profile('b', { followersGainPct: 2 })]);
        expect(medianMarker(rows, { followers: 1, followersGainPct: 2, postsPerWeek: 1, reactionsPerPost: 1, basedOn: 2 })).toBe(50);
        expect(medianMarker(rows, null)).toBeNull();
    });
});

describe('podział i porównanie z medianą', () => {
    it('Ty osobno, konkurenci od największego', () => {
        const split = splitProfiles([
            profile('maly', { followers: 500 }),
            profile('duzy', { followers: 9000 }),
            profile('ja', { isSelf: true }),
        ]);
        expect(split.self?.username).toBe('ja');
        expect(split.competitors.map(p => p.username)).toEqual(['duzy', 'maly']);
    });

    it('±10% od mediany to norma', () => {
        expect(versusMedian(120, 100)).toBe('above');
        expect(versusMedian(105, 100)).toBe('even');
        expect(versusMedian(80, 100)).toBe('below');
        expect(versusMedian(null, 100)).toBeNull();
        expect(versusMedian(10, null)).toBeNull();
    });

    it('przyrost liczony krócej niż okno ma podpis', () => {
        expect(growthSinceLabel('2026-09-27', '2026-07-18')).toMatch(/^od 27/);
        expect(growthSinceLabel('2026-07-18', '2026-07-18')).toBeNull();
        expect(growthSinceLabel(null, '2026-07-18')).toBeNull();
    });
});

describe('kalendarz publikacji na telefonie', () => {
    it('podpis tygodnia od poniedziałku do niedzieli', () => {
        expect(weekRangeLabel('2026-10-05')).toBe('5–11 paź');
        expect(weekRangeLabel('2026-09-28')).toBe('28 wrz–4 paź');
        expect(weekRangeLabel('2025-12-29')).toBe('29 gru–4 sty');
    });

    it('tydzień należy do miesiąca swojego czwartku', () => {
        const weeks = ['2026-08-24', '2026-08-31', '2026-09-07', '2026-09-28', '2026-10-05'];
        expect(monthColumns(weeks)).toEqual([
            { month: '2026-08-01', weekIndexes: [0] },
            { month: '2026-09-01', weekIndexes: [1, 2] },
            { month: '2026-10-01', weekIndexes: [3, 4] },
        ]);
    });

    it('rok tygodni to co najwyżej 13 miesięcy, każdy tydzień dokładnie raz', () => {
        const weeks = Array.from({ length: 53 }, (_, i) => {
            const d = new Date('2025-10-20T00:00:00');
            d.setDate(d.getDate() + i * 7);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        });
        const columns = monthColumns(weeks);
        expect(columns.length).toBeLessThanOrEqual(13);
        expect(columns.flatMap(c => c.weekIndexes)).toEqual(weeks.map((_, i) => i));
    });

    it('stopień miesiąca to średnia na tydzień w skali tygodnia', () => {
        expect(monthLevel(0, 4)).toBe(0);
        expect(monthLevel(1, 4)).toBe(1);
        expect(monthLevel(4, 4)).toBe(1);
        expect(monthLevel(8, 4)).toBe(2);
        expect(monthLevel(12, 4)).toBe(3);
        expect(monthLevel(3, 0)).toBe(0);
    });
});
