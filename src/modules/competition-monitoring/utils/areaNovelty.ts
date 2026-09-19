import type { AdvertiserRow } from '../types';

/**
 * Słowa odznaki „nowe" w tabeli reklamodawców w okolicy.
 *
 * O tym, CZY coś jest nowe, decyduje serwer (okno liczone od startu emisji wg
 * Meta, debiut po rejestrze reklamodawców). Tu jest wyłącznie tłumaczenie tej
 * decyzji na jedną etykietę — wyjęte z komponentu, bo odmiana i pierwszeństwo
 * („nowa firma" bije „nową kampanię") to logika, którą da się sprawdzić testem.
 */

export type NoveltyKind = 'ADVERTISER' | 'CAMPAIGN';

export interface NoveltyBadge {
    kind: NoveltyKind;
    /** Krótko, do pigułki w wierszu. */
    label: string;
    /** Pełne zdanie do tooltipa i czytnika ekranu. */
    title: string;
}

const campaignWord = (n: number): string => {
    if (n === 1) return 'nowa kampania';
    const last = n % 10;
    const lastTwo = n % 100;
    if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'nowe kampanie';
    return 'nowych kampanii';
};

/** „12 wrz" z daty ISO bez czasu. Godzina zerowa w UTC, żeby strefa nie przesunęła dnia. */
export const formatStartDay = (isoDate: string): string =>
    new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    });

export const noveltyBadge = (row: AdvertiserRow, windowDays: number): NoveltyBadge | null => {
    const since = row.latestCampaignStart ? ` od ${formatStartDay(row.latestCampaignStart)}` : '';
    const fades = `Odznaka gaśnie ${windowDays} dni po starcie emisji.`;

    if (row.newAdvertiser) {
        return {
            kind: 'ADVERTISER',
            label: 'Nowa firma',
            title: `Ta firma zaczęła się reklamować w Twoim rejonie dopiero teraz${since}. ${fades}`,
        };
    }
    if (row.newCampaigns > 0) {
        const count = row.newCampaigns === 1 ? '' : `${row.newCampaigns} `;
        return {
            kind: 'CAMPAIGN',
            label: row.newCampaigns === 1 ? 'Nowa kampania' : `${row.newCampaigns} nowe`,
            title: `${count}${campaignWord(row.newCampaigns)}${since} u firmy, która już się tu reklamowała. ${fades}`,
        };
    }
    return null;
};

const fewForm = (n: number): boolean => {
    const last = n % 10;
    const lastTwo = n % 100;
    return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
};

/** „1 nowa firma", „2 nowe firmy", „5 nowych firm" — do wiersza podsumowania nad tabelą. */
export const newAdvertisersPhrase = (n: number): string => {
    if (n === 1) return '1 nowa firma';
    return `${n} ${fewForm(n) ? 'nowe firmy' : 'nowych firm'}`;
};

/** „1 nowa kampania", „2 nowe kampanie", „5 nowych kampanii". */
export const newCampaignsPhrase = (n: number): string => `${n} ${campaignWord(n)}`;

/**
 * Jedno zdanie o nowościach w całej tabeli: „2 nowe firmy i 3 nowe kampanie
 * z ostatnich 14 dni". Null, gdy nie ma o czym mówić — wtedy w podsumowaniu
 * nie ma nawet pustego miejsca po nowościach.
 */
export const noveltySummary = (newAdvertisers: number, newCampaigns: number, windowDays: number): string | null => {
    const parts: string[] = [];
    if (newAdvertisers > 0) parts.push(newAdvertisersPhrase(newAdvertisers));
    if (newCampaigns > 0) parts.push(newCampaignsPhrase(newCampaigns));
    if (parts.length === 0) return null;
    return `${parts.join(' i ')} z ostatnich ${windowDays} dni`;
};
