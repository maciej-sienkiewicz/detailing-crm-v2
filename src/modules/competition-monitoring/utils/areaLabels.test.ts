import { describe, expect, it } from 'vitest';
import type { AdvertiserRow } from '../types';
import {
    activeAdsWord,
    campaignsOf,
    companiesWord,
    formatStartDay,
    noveltyBadge,
    splitByRelevance,
} from './areaLabels';

const row = (overrides: Partial<AdvertiserRow> = {}): AdvertiserRow => ({
    pageId: '100',
    companyName: 'Auto Spa',
    activeAds: 2,
    reach: 1000,
    adLibraryUrl: 'https://example.invalid',
    sampleSnapshotUrl: null,
    instagram: null,
    newCampaigns: 0,
    newAdvertiser: false,
    latestCampaignStart: null,
    ...overrides,
});

/**
 * Serwer mówi, co jest nowe; ekran ma to tylko poprawnie nazwać. Błąd tutaj to
 * „2 nowa kampanie" w tabeli, którą właściciel studia pokazuje wspólnikowi.
 */
describe('odznaka nowości w tabeli reklamodawców', () => {
    it('firma bez nowości nie dostaje odznaki', () => {
        expect(noveltyBadge(row(), 14)).toBeNull();
    });

    it('debiut wygrywa z nową kampanią - jedna odznaka na wiersz', () => {
        const badge = noveltyBadge(
            row({ newAdvertiser: true, newCampaigns: 3, latestCampaignStart: '2026-09-12' }),
            14
        );
        expect(badge?.kind).toBe('ADVERTISER');
        expect(badge?.label).toBe('Nowa firma');
        expect(badge?.title).toContain('od 12 wrz');
        expect(badge?.title).toContain('14 dni');
    });

    it('jedna nowa kampania znanej firmy', () => {
        const badge = noveltyBadge(row({ newCampaigns: 1, latestCampaignStart: '2026-09-15' }), 14);
        expect(badge?.kind).toBe('CAMPAIGN');
        expect(badge?.label).toBe('Nowa kampania');
        expect(badge?.title).toBe(
            'nowa kampania od 15 wrz u firmy, która już się tu reklamowała. Odznaka zniknie 14 dni od startu reklamy.'
        );
    });

    it('kilka nowych kampanii odmienia się po polsku', () => {
        expect(noveltyBadge(row({ newCampaigns: 2, latestCampaignStart: '2026-09-15' }), 14)?.title).toContain(
            '2 nowe kampanie'
        );
        expect(noveltyBadge(row({ newCampaigns: 5, latestCampaignStart: '2026-09-15' }), 14)?.title).toContain(
            '5 nowych kampanii'
        );
        expect(noveltyBadge(row({ newCampaigns: 12, latestCampaignStart: '2026-09-15' }), 14)?.title).toContain(
            '12 nowych kampanii'
        );
        expect(noveltyBadge(row({ newCampaigns: 3 }), 14)?.label).toBe('3 nowe');
        expect(noveltyBadge(row({ newCampaigns: 5 }), 14)?.label).toBe('5 nowych');
    });

    it('data startu nie przesuwa się o dzień przez strefę czasową', () => {
        expect(formatStartDay('2026-09-01')).toBe('1 wrz');
        expect(formatStartDay('2026-12-31')).toBe('31 gru');
    });

    it('licznik nad tabelą odmienia firmy i reklamy', () => {
        expect(companiesWord(1)).toBe('firma');
        expect(companiesWord(3)).toBe('firmy');
        expect(companiesWord(12)).toBe('firm');
        expect(companiesWord(22)).toBe('firmy');
        expect(companiesWord(25)).toBe('firm');

        expect(activeAdsWord(1)).toBe('aktywna reklama');
        expect(activeAdsWord(4)).toBe('aktywne reklamy');
        expect(activeAdsWord(13)).toBe('aktywnych reklam');
        expect(activeAdsWord(73)).toBe('aktywne reklamy');
    });
});

describe('podział reklamodawców w okolicy', () => {
    it('sklepy i producenci osobno, nieocenione zostają przy usługach', () => {
        const rows = [
            { pageId: '1', relevance: 'SERVICE' },
            { pageId: '2', relevance: 'PRODUCTS' },
            { pageId: '3', relevance: 'PENDING' },
            { pageId: '4' },
        ];
        const { services, products } = splitByRelevance(rows);
        expect(services.map(r => r.pageId)).toEqual(['1', '3', '4']);
        expect(products.map(r => r.pageId)).toEqual(['2']);
    });

    it('liczymy kampanie, a gdy serwer ich nie podał, reklamy', () => {
        expect(campaignsOf({ activeAds: 3, activeCampaigns: 1 })).toBe(1);
        expect(campaignsOf({ activeAds: 3 })).toBe(3);
    });
});
