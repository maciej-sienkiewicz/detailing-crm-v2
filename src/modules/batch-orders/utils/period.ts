// src/modules/batch-orders/utils/period.ts
//
// Okres rozliczeniowy: jedna para dat „od–do" (włącznie), wspólna dla całego ekranu.
// Wcześniej każdy kontrahent miał własny filtr, więc miesięczne rozliczenie ośmiu
// kontrahentów oznaczało osiem razy przestawiony miesiąc.
//
// Wszystko liczymy w czasie LOKALNYM. `toISOString()` daje datę w UTC, więc między
// północą a 1-2 w nocy podpowiadało wczorajszy dzień, a `new Date('2026-09-01')`
// parsuje się jako północ UTC - w strefie na zachód od Greenwich to już 31 sierpnia.

export interface Period {
    /** YYYY-MM-DD, włącznie. */
    from: string;
    /** YYYY-MM-DD, włącznie. */
    to: string;
}

const MONTHS_NOMINATIVE = [
    'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
    'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

/** Miejscownik z przyimkiem: „we wrześniu", „w lutym". */
const MONTHS_IN = [
    'w styczniu', 'w lutym', 'w marcu', 'w kwietniu', 'w maju', 'w czerwcu',
    'w lipcu', 'w sierpniu', 'we wrześniu', 'w październiku', 'w listopadzie', 'w grudniu',
];

const pad = (n: number) => String(n).padStart(2, '0');

export const toIsoDate = (d: Date): string =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Dzisiejsza data w strefie użytkownika - domyślna data nowego wpisu. */
export const todayIso = (now: Date = new Date()): string => toIsoDate(now);

/** YYYY-MM-DD → lokalna północ tego dnia (nie UTC). */
export const parseIsoDate = (iso: string): Date => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
};

export const monthPeriod = (year: number, monthIndex: number): Period => ({
    from: toIsoDate(new Date(year, monthIndex, 1)),
    to: toIsoDate(new Date(year, monthIndex + 1, 0)),
});

export const currentMonthPeriod = (now: Date = new Date()): Period =>
    monthPeriod(now.getFullYear(), now.getMonth());

/** Czy okres to dokładnie jeden pełny miesiąc kalendarzowy. */
export const isWholeMonth = (p: Period): boolean => {
    const from = parseIsoDate(p.from);
    const m = monthPeriod(from.getFullYear(), from.getMonth());
    return m.from === p.from && m.to === p.to;
};

/**
 * Strzałki ‹ › przesuwają o miesiąc. Zakres niestandardowy przechodzi przy tym
 * w pełny miesiąc, w którym się zaczynał, przesunięty o `delta` - strzałka ma
 * zawsze prowadzić do „poprzedniego/następnego miesiąca", nie do dziwnego zakresu.
 */
export const shiftMonth = (p: Period, delta: number): Period => {
    const from = parseIsoDate(p.from);
    return monthPeriod(from.getFullYear(), from.getMonth() + delta);
};

/** DD.MM.YYYY */
export const formatDay = (iso: string): string => {
    const d = parseIsoDate(iso);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/** DD.MM */
export const formatDayShort = (iso: string): string => {
    const d = parseIsoDate(iso);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
};

/** Znacznik czasu z serwera (ISO z godziną) → DD.MM.YYYY w strefie użytkownika. */
export const formatInstantDay = (iso: string): string => toIsoDate(new Date(iso)).split('-').reverse().join('.');

/**
 * Nazwa okresu jako rzeczownik („Nowe zestawienie: wrzesień 2026"): pełny miesiąc
 * jako nazwa miesiąca, każdy inny zakres jako daty.
 */
export const periodPhrase = (p: Period): string => {
    if (isWholeMonth(p)) {
        const d = parseIsoDate(p.from);
        return `${MONTHS_NOMINATIVE[d.getMonth()]} ${d.getFullYear()}`;
    }
    const from = parseIsoDate(p.from);
    const to = parseIsoDate(p.to);
    if (from.getFullYear() === to.getFullYear()) {
        return `${formatDayShort(p.from)}–${formatDay(p.to)}`;
    }
    return `${formatDay(p.from)}–${formatDay(p.to)}`;
};

/** To samo co `periodPhrase`, z wielką literą - na przycisk i nagłówek. */
export const periodTitle = (p: Period): string => {
    const phrase = periodPhrase(p);
    return phrase.charAt(0).toUpperCase() + phrase.slice(1);
};

/**
 * Okres jako okolicznik czasu - do zdań: „Czeka na zestawienie we wrześniu 2026",
 * „Brak aut w okresie 03.09–17.09.2026".
 */
export const periodIn = (p: Period): string => {
    if (isWholeMonth(p)) {
        const d = parseIsoDate(p.from);
        return `${MONTHS_IN[d.getMonth()]} ${d.getFullYear()}`;
    }
    return `w okresie ${periodPhrase(p)}`;
};
