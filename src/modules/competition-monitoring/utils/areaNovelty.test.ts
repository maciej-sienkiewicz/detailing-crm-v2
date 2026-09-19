import { describe, expect, it } from 'vitest';
import type { AdvertiserRow } from '../types';
import { formatStartDay, noveltyBadge, noveltySummary } from './areaNovelty';

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
            'nowa kampania od 15 wrz u firmy, która już się tu reklamowała. Odznaka gaśnie 14 dni po starcie emisji.'
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
    });

    it('data startu nie przesuwa się o dzień przez strefę czasową', () => {
        expect(formatStartDay('2026-09-01')).toBe('1 wrz');
        expect(formatStartDay('2026-12-31')).toBe('31 gru');
    });

    it('zdanie o nowościach nad tabelą odmienia firmy i kampanie', () => {
        expect(noveltySummary(0, 0, 14)).toBeNull();
        expect(noveltySummary(1, 0, 14)).toBe('1 nowa firma z ostatnich 14 dni');
        expect(noveltySummary(2, 3, 14)).toBe('2 nowe firmy i 3 nowe kampanie z ostatnich 14 dni');
        expect(noveltySummary(5, 1, 14)).toBe('5 nowych firm i 1 nowa kampania z ostatnich 14 dni');
        expect(noveltySummary(0, 22, 14)).toBe('22 nowe kampanie z ostatnich 14 dni');
        expect(noveltySummary(12, 0, 14)).toBe('12 nowych firm z ostatnich 14 dni');
    });
});
