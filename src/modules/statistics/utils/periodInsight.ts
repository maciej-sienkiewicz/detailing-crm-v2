// src/modules/statistics/utils/periodInsight.ts
//
// „Co złożyło się na ten okres" - arytmetyka panelu „Szczegóły okresu" w Statystykach.
//
// Panel ma odpowiedzieć właścicielowi w kilka sekund: czy okres był lepszy, czy gorszy
// od zwykłego, i na co poszły pieniądze. Dawniej pokazywał trzy liczby bez punktu
// odniesienia i listę wizyt; „25 860 zł" nie mówiło, czy to dużo.
//
// Zasady ustalone z biznesem (PM, właściciel studia, UX):
//   - Punkt odniesienia to TYPOWY okres z pełnych okresów zakresu widoku: mediana liczby
//     wizyt (jedna wizyta z PPF za 9 tys. zł nie wypacza mediany w małym studiu) razy
//     średnia wartość wizyty liczona ważenie (suma sprzedaży / suma wizyt).
//   - Okres badany, okres, który jeszcze trwa, i okresy przycięte na brzegach zakresu nie
//     wchodzą do odniesienia - niepełny tydzień zaniżałby „zwykły tydzień".
//   - Mniej niż 4 pełne okresy do porównania: odniesieniem jest poprzedni pełny okres,
//     podpisany wprost. Bez niego porównania nie ma.
//   - Okres niepełny (trwa albo przycięty zakresem) nie dostaje werdyktu - porównanie
//     niepełnego tygodnia z pełnym zawsze wychodzi „gorzej".
//   - Panel pokazuje liczby, nie zdania: kwota, różnica do zwykłego okresu, skład.
//     Pierwsza wersja rozpisywała różnicę na efekt liczby wizyt i średniej wizyty
//     i dokładała akapity o największej wizycie - biznes odrzucił ją jako przegadaną.

import type { Granularity, StatsDataPoint } from '../types';

// ─── Daty okresu ──────────────────────────────────────────────────────────────

const MONTHS_NOM = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Data kalendarzowa bez strefy: liczymy w UTC, żeby zmiana czasu nie przesuwała dni. */
const toUtc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
    const d = toUtc(iso);
    d.setUTCDate(d.getUTCDate() + days);
    return toIso(d);
};
const lastDayOfMonth = (year: number, month: number) => toIso(new Date(Date.UTC(year, month, 0)));
const pad = (n: number) => String(n).padStart(2, '0');

/** Poniedziałek tygodnia ISO `week` roku tygodniowego `year`. */
function isoWeekMonday(year: number, week: number): string {
    // 4 stycznia zawsze leży w pierwszym tygodniu ISO.
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    jan4.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (week - 1) * 7);
    return toIso(jan4);
}

/** Pierwszy i ostatni dzień okresu (włącznie), z klucza, który zwraca serwer. */
export function periodBounds(period: string, granularity: Granularity): { start: string; end: string } | null {
    let m: RegExpMatchArray | null;
    switch (granularity) {
        case 'DAILY':
            return /^\d{4}-\d{2}-\d{2}$/.test(period) ? { start: period, end: period } : null;
        case 'WEEKLY': {
            if (!(m = period.match(/^(\d{4})-W(\d{2})$/))) return null;
            const start = isoWeekMonday(Number(m[1]), Number(m[2]));
            return { start, end: addDays(start, 6) };
        }
        case 'MONTHLY': {
            if (!(m = period.match(/^(\d{4})-(\d{2})$/))) return null;
            return { start: `${m[1]}-${m[2]}-01`, end: lastDayOfMonth(Number(m[1]), Number(m[2])) };
        }
        case 'QUARTERLY': {
            if (!(m = period.match(/^(\d{4})-Q([1-4])$/))) return null;
            const first = (Number(m[2]) - 1) * 3 + 1;
            return { start: `${m[1]}-${pad(first)}-01`, end: lastDayOfMonth(Number(m[1]), first + 2) };
        }
        case 'YEARLY':
            return /^\d{4}$/.test(period) ? { start: `${period}-01-01`, end: `${period}-12-31` } : null;
    }
}

const dayMonth = (iso: string) => {
    const d = toUtc(iso);
    return `${d.getUTCDate()} ${MONTHS_GEN[d.getUTCMonth()]}`;
};

/** „Tydzień 5–11 października 2026", „Wtorek, 7 października 2026", „Lipiec–wrzesień 2026". */
export function periodTitle(period: string, granularity: Granularity): string {
    const b = periodBounds(period, granularity);
    if (!b) return period;
    const s = toUtc(b.start);
    const e = toUtc(b.end);
    switch (granularity) {
        case 'DAILY':
            return `${capitalize(WEEKDAYS[s.getUTCDay()])}, ${dayMonth(b.start)} ${s.getUTCFullYear()}`;
        case 'WEEKLY':
            if (s.getUTCFullYear() !== e.getUTCFullYear()) {
                return `Tydzień ${dayMonth(b.start)} ${s.getUTCFullYear()} – ${dayMonth(b.end)} ${e.getUTCFullYear()}`;
            }
            if (s.getUTCMonth() !== e.getUTCMonth()) {
                return `Tydzień ${dayMonth(b.start)} – ${dayMonth(b.end)} ${e.getUTCFullYear()}`;
            }
            return `Tydzień ${s.getUTCDate()}–${dayMonth(b.end)} ${e.getUTCFullYear()}`;
        case 'MONTHLY':
            return `${capitalize(MONTHS_NOM[s.getUTCMonth()])} ${s.getUTCFullYear()}`;
        case 'QUARTERLY':
            return `${capitalize(MONTHS_NOM[s.getUTCMonth()])}–${MONTHS_NOM[e.getUTCMonth()]} ${s.getUTCFullYear()}`;
        case 'YEARLY':
            return `Rok ${s.getUTCFullYear()}`;
    }
}

/** Rzeczownik okresu w trzech przypadkach, których używają teksty panelu. */
export const PERIOD_NOUN: Record<Granularity, { nom: string; loc: string; gen: string; genPl: string; ins: string }> = {
    DAILY: { nom: 'dzień', loc: 'dniu', gen: 'dnia', genPl: 'dni', ins: 'dniem' },
    WEEKLY: { nom: 'tydzień', loc: 'tygodniu', gen: 'tygodnia', genPl: 'tygodni', ins: 'tygodniem' },
    MONTHLY: { nom: 'miesiąc', loc: 'miesiącu', gen: 'miesiąca', genPl: 'miesięcy', ins: 'miesiącem' },
    QUARTERLY: { nom: 'kwartał', loc: 'kwartale', gen: 'kwartału', genPl: 'kwartałów', ins: 'kwartałem' },
    YEARLY: { nom: 'rok', loc: 'roku', gen: 'roku', genPl: 'lat', ins: 'rokiem' },
};

export type PeriodCoverage =
    | { kind: 'full' }
    /** Okres jeszcze trwa - dane do `until` włącznie. */
    | { kind: 'ongoing'; until: string }
    /** Zakres widoku obcina okres - liczone są tylko dni `from`–`to`. */
    | { kind: 'clipped'; from: string; to: string };

/**
 * Czy okres jest pełny. `rangeStart`/`rangeEnd` to zakres widoku (włącznie), `today`
 * - dzisiejsza data; wszystko jako „RRRR-MM-DD".
 */
export function periodCoverage(
    period: string,
    granularity: Granularity,
    rangeStart: string,
    rangeEnd: string,
    today: string,
): PeriodCoverage {
    const b = periodBounds(period, granularity);
    if (!b) return { kind: 'full' };
    if (b.start <= today && today <= b.end) return { kind: 'ongoing', until: today };
    const from = b.start < rangeStart ? rangeStart : b.start;
    const to = b.end > rangeEnd ? rangeEnd : b.end;
    if (from !== b.start || to !== b.end) return { kind: 'clipped', from, to };
    return { kind: 'full' };
}

/** „7 października" - do podpisów okresu niepełnego. */
export const coverageDay = dayMonth;

// ─── Porównanie z typowym okresem ────────────────────────────────────────────

export interface PeriodComparison {
    /** typical - typowy okres zakresu; previous - poprzedni pełny okres (za mało okresów). */
    basis: 'typical' | 'previous';
    /** Liczba wizyt odniesienia (mediana - może być ułamkiem). */
    refCount: number;
    /** Sprzedaż odniesienia w groszach: refCount × średnia ważona wizyty, zaokrąglone. */
    refRevenue: number;
    /** Sprzedaż okresu minus odniesienie. */
    diff: number;
}

export const MIN_TYPICAL_PERIODS = 4;

const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Porównanie okresu `period` z typowym okresem szeregu `series` (ten sam szereg, który
 * rysuje wykres - przy filtrze kategorii to szereg kategorii). `isComparable` mówi,
 * które okresy są pełne. Zwraca null, gdy okres jest niepełny albo nie ma z czym porównać.
 */
export function comparePeriod(
    series: StatsDataPoint[],
    period: string,
    isComparable: (period: string) => boolean,
): PeriodComparison | null {
    const index = series.findIndex(p => p.period === period);
    if (index < 0 || !isComparable(period)) return null;
    const current = series[index];

    const others = series.filter(p => p.period !== period && isComparable(p.period));
    let basis: PeriodComparison['basis'];
    let refCount: number;
    let refAvg: number;

    if (others.length >= MIN_TYPICAL_PERIODS) {
        const visits = others.reduce((s, p) => s + p.orderCount, 0);
        const revenue = others.reduce((s, p) => s + p.totalRevenueGross, 0);
        basis = 'typical';
        refCount = median(others.map(p => p.orderCount));
        refAvg = visits > 0 ? revenue / visits : 0;
    } else {
        const previous = index > 0 ? series[index - 1] : undefined;
        if (!previous || !isComparable(previous.period)) return null;
        basis = 'previous';
        refCount = previous.orderCount;
        refAvg = previous.orderCount > 0 ? previous.totalRevenueGross / previous.orderCount : 0;
    }

    const refRevenue = Math.round(refCount * refAvg);
    return { basis, refCount, refRevenue, diff: current.totalRevenueGross - refRevenue };
}

/** Różnica w granicach 5% odniesienia to „tyle co zwykle" - złotówki w tę i z powrotem nie są wiadomością. */
export const isAboutTheSame = (c: PeriodComparison) =>
    c.refRevenue > 0 && Math.abs(c.diff) <= c.refRevenue * 0.05;

// ─── Skład okresu ─────────────────────────────────────────────────────────────

export interface CompositionVisit {
    services: { serviceName: string; priceGross: number; categoryId?: string | null; inCategory?: boolean }[];
}

export interface CompositionRow {
    key: string;
    name: string;
    color: string | null;
    amount: number;
}

/**
 * Na co poszły pieniądze. Bez filtra - kategorie (usługi bez kategorii razem jako
 * „Bez kategorii"); z filtrem - usługi tej kategorii. Malejąco po kwocie.
 */
export function composition(
    visits: CompositionVisit[],
    categories: { categoryId: string; categoryName: string; color: string | null }[],
    filtered: boolean,
): CompositionRow[] {
    const byKey = new Map<string, CompositionRow>();
    const catById = new Map(categories.map(c => [c.categoryId, c]));
    for (const visit of visits) {
        for (const service of visit.services) {
            if (filtered && !service.inCategory) continue;
            let key: string;
            let name: string;
            let color: string | null;
            const cat = service.categoryId ? catById.get(service.categoryId) : undefined;
            if (filtered) {
                // Usługi jednej kategorii - wszystkie w jej kolorze, jak kategoria w wykresie.
                key = `svc:${service.serviceName}`;
                name = service.serviceName;
                color = cat?.color ?? null;
            } else {
                key = cat ? `cat:${cat.categoryId}` : 'none';
                name = cat ? cat.categoryName : 'Bez kategorii';
                color = cat ? cat.color : null;
            }
            const row = byKey.get(key) ?? { key, name, color, amount: 0 };
            row.amount += service.priceGross;
            byKey.set(key, row);
        }
    }
    return [...byKey.values()]
        .filter(row => row.amount > 0)
        .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'pl'));
}
