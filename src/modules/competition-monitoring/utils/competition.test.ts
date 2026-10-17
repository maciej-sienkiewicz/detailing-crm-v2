import { describe, expect, it } from 'vitest';
import {
    calendarLevel,
    formatPerWeek,
    formatSignedCount,
    formatSignedPct,
    growthRanking,
    growthSinceLabel,
    medianMarker,
    splitProfiles,
    versusMedian,
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
