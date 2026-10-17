import type { CompetitionMedian, CompetitionProfile } from '../types';

/**
 * Rachunki zakładki Konkurencja - bez Reacta, żeby dało się je sprawdzić testem.
 */

const pl = (value: number, decimals: number) =>
    value.toLocaleString('pl-PL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** „+3,8%", „−0,4%", „0%". Prawdziwy minus, nie łącznik - łącznik czyta się jak myślnik. */
export const formatSignedPct = (value: number | null | undefined, decimals = 1): string | null => {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    const rounded = Number(value.toFixed(decimals));
    if (rounded === 0) return '0%';
    return `${rounded > 0 ? '+' : '−'}${pl(Math.abs(rounded), decimals)}%`;
};

/** „+46", „−12". */
export const formatSignedCount = (value: number | null | undefined): string | null => {
    if (value === null || value === undefined) return null;
    if (value === 0) return '0';
    return `${value > 0 ? '+' : '−'}${Math.abs(value).toLocaleString('pl-PL')}`;
};

/** Posty na tydzień zawsze z jednym miejscem: „1,0" i „1,5" stoją w kolumnie równo. */
export const formatPerWeek = (value: number | null | undefined): string | null =>
    value === null || value === undefined ? null : pl(value, 1);

/** Kalendarz publikacji ma cztery stopnie: 0, 1, 2 i „3 albo więcej". */
export const calendarLevel = (posts: number): 0 | 1 | 2 | 3 => (posts <= 0 ? 0 : posts >= 3 ? 3 : (posts as 1 | 2));

export interface RankingRow {
    profile: CompetitionProfile;
    /** Szerokość paska 0-100 względem największego przyrostu w zestawieniu. */
    width: number;
    negative: boolean;
}

/**
 * Ranking przyrostu: Ty i konkurenci, od największego przyrostu w procentach. Procent, bo
 * przyrost w sztukach porównuje małe studio z dużym kontem i zawsze przegrywa.
 * Profile bez dwóch pomiarów w oknie nie mają miejsca w rankingu - nie zgadujemy.
 */
export const growthRanking = (profiles: CompetitionProfile[]): RankingRow[] => {
    const ranked = profiles
        .filter(p => p.followersGainPct !== null)
        .sort((a, b) => (b.followersGainPct ?? 0) - (a.followersGainPct ?? 0));
    const max = Math.max(0.1, ...ranked.map(p => Math.abs(p.followersGainPct ?? 0)));
    return ranked.map(profile => ({
        profile,
        width: Math.round((Math.abs(profile.followersGainPct ?? 0) / max) * 100),
        negative: (profile.followersGainPct ?? 0) < 0,
    }));
};

/** Położenie kreski mediany na tej samej skali co paski; null, gdy mediany nie ma. */
export const medianMarker = (rows: RankingRow[], median: CompetitionMedian | null): number | null => {
    if (!median || median.followersGainPct === null || rows.length === 0) return null;
    const max = Math.max(0.1, ...rows.map(r => Math.abs(r.profile.followersGainPct ?? 0)));
    return Math.min(100, Math.round((Math.abs(median.followersGainPct) / max) * 100));
};

/** Ty na górze, potem konkurenci od największego. */
export const splitProfiles = (profiles: CompetitionProfile[]) => {
    const byFollowers = (a: CompetitionProfile, b: CompetitionProfile) => (b.followers ?? -1) - (a.followers ?? -1);
    return {
        self: profiles.find(p => p.isSelf) ?? null,
        competitors: profiles.filter(p => !p.isSelf).sort(byFollowers),
    };
};

/**
 * Porównanie z medianą konkurencji jako kierunek: wyżej, niżej albo „w normie" (±10%).
 * Służy wyłącznie do strzałki obok liczby - zdania pod każdą komórką zniknęły z tabeli.
 */
export const versusMedian = (value: number | null, median: number | null | undefined): 'above' | 'below' | 'even' | null => {
    if (value === null || median === null || median === undefined || median === 0) return null;
    const ratio = value / median;
    if (ratio >= 1.1) return 'above';
    if (ratio <= 0.9) return 'below';
    return 'even';
};

/** „od 27 wrz", gdy pomiar zaczął się później niż okno - inaczej null. */
export const growthSinceLabel = (growthFrom: string | null, windowFrom: string): string | null => {
    if (!growthFrom || growthFrom <= windowFrom) return null;
    const date = new Date(`${growthFrom}T00:00:00`);
    return `od ${date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}`;
};
