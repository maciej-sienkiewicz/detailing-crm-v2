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

/** „6–12 paź", „29 wrz–5 paź": tydzień od poniedziałku do niedzieli, do podpisu pod kalendarzem. */
export const weekRangeLabel = (weekStart: string): string => {
    const start = new Date(`${weekStart}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const month = (d: Date) => d.toLocaleDateString('pl-PL', { month: 'short' });
    return start.getMonth() === end.getMonth()
        ? `${start.getDate()}–${end.getDate()} ${month(end)}`
        : `${start.getDate()} ${month(start)}–${end.getDate()} ${month(end)}`;
};

export interface MonthColumn {
    /** Pierwszy dzień miesiąca, „2026-10-01". */
    month: string;
    /** Indeksy tygodni z `weeks`, które należą do tego miesiąca. */
    weekIndexes: number[];
}

/**
 * Rok tygodni złożony w miesiące - na telefonie 53 kwadraty po 10 px nie dawały się
 * odczytać, a 12-13 miesięcy mieści się w szerokości ekranu bez przewijania.
 * Tydzień należy do miesiąca, w którym wypada jego czwartek (większość jego dni),
 * tak jak w numeracji tygodni ISO - inaczej tydzień 29 wrz-5 paź liczyłby się do września.
 */
export const monthColumns = (weeks: string[]): MonthColumn[] => {
    const columns: MonthColumn[] = [];
    weeks.forEach((week, index) => {
        const thursday = new Date(`${week}T00:00:00`);
        thursday.setDate(thursday.getDate() + 3);
        const month = `${thursday.getFullYear()}-${String(thursday.getMonth() + 1).padStart(2, '0')}-01`;
        const last = columns[columns.length - 1];
        if (last && last.month === month) last.weekIndexes.push(index);
        else columns.push({ month, weekIndexes: [index] });
    });
    return columns;
};

/**
 * Stopień miesiąca w tej samej skali co tydzień: średnia postów na tydzień, żeby
 * legenda „0 … 3+ posty" znaczyła to samo w obu widokach. Suma miesiąca dawałaby
 * „3+" każdemu, kto publikuje raz w tygodniu.
 */
export const monthLevel = (posts: number, weekCount: number): 0 | 1 | 2 | 3 => {
    if (posts <= 0 || weekCount <= 0) return 0;
    const perWeek = posts / weekCount;
    return perWeek >= 2.5 ? 3 : perWeek >= 1.5 ? 2 : 1;
};
