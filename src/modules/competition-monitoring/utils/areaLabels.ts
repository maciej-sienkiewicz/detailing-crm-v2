import type { AdvertiserRow } from '../types';

/**
 * Słowa tabeli „Reklamodawcy w okolicy": odznaki nowości i odmiana liczebników.
 *
 * O tym, CZY coś jest nowe, decyduje serwer (okno liczone od startu emisji wg
 * Meta, debiut po rejestrze reklamodawców, odznaczenie studia). Tu jest wyłącznie
 * tłumaczenie tej decyzji na słowa — wyjęte z komponentu, bo polska odmiana i
 * pierwszeństwo („nowa firma" bije „nową kampanię") to logika, którą da się
 * sprawdzić testem, a „22 firm" w tabeli oglądanej przy kliencie kłuje w oczy.
 */

export type NoveltyKind = 'ADVERTISER' | 'CAMPAIGN';

export interface NoveltyBadge {
    kind: NoveltyKind;
    /** Krótko, do pigułki w wierszu. */
    label: string;
    /** Pełne zdanie do tooltipa i czytnika ekranu. */
    title: string;
}

/** Polska forma „od 2 do 4": 2-4, 22-24, ale nie 12-14. */
const fewForm = (n: number): boolean => {
    const last = n % 10;
    const lastTwo = n % 100;
    return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
};

const campaignWord = (n: number): string => {
    if (n === 1) return 'nowa kampania';
    return fewForm(n) ? 'nowe kampanie' : 'nowych kampanii';
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

/**
 * Samo słowo, bez liczby: licznik nad tabelą pogrubia liczbę i zostawia słowo
 * ciche, więc te dwie rzeczy nie mogą przyjechać jednym stringiem.
 */

/** „firma" / „firmy" / „firm". */
export const companiesWord = (n: number): string => {
    if (n === 1) return 'firma';
    return fewForm(n) ? 'firmy' : 'firm';
};

/** „aktywna reklama" / „aktywne reklamy" / „aktywnych reklam". */
export const activeAdsWord = (n: number): string => {
    if (n === 1) return 'aktywna reklama';
    return fewForm(n) ? 'aktywne reklamy' : 'aktywnych reklam';
};
