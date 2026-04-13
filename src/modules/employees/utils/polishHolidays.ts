/**
 * Polish public holidays calculator.
 * Computes fixed and moveable holidays (including Easter) for any given year.
 */

/** Compute Easter Sunday using the Gaussian / Butcher algorithm. */
function computeEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-indexed
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

function addDays(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Returns a Set of YYYY-MM-DD strings representing all Polish public holidays
 * for the given year.
 *
 * Fixed holidays:
 *  01-01  Nowy Rok
 *  01-06  Trzech Króli (Epifania)
 *  05-01  Święto Pracy
 *  05-03  Święto Konstytucji 3 Maja
 *  08-15  Wniebowzięcie NMP
 *  11-01  Wszystkich Świętych
 *  11-11  Święto Niepodległości
 *  12-25  Boże Narodzenie
 *  12-26  Drugi dzień Bożego Narodzenia
 *
 * Moveable (Easter-based):
 *  Easter Sunday
 *  Easter Monday  (+1)
 *  Zielone Świątki / Whit Sunday (+49)
 *  Boże Ciało / Corpus Christi (+60)
 */
export function getPolishHolidays(year: number): Set<string> {
    const easter = computeEaster(year);

    return new Set<string>([
        // Fixed
        `${year}-01-01`,
        `${year}-01-06`,
        `${year}-05-01`,
        `${year}-05-03`,
        `${year}-08-15`,
        `${year}-11-01`,
        `${year}-11-11`,
        `${year}-12-25`,
        `${year}-12-26`,
        // Moveable
        toDateStr(easter),
        toDateStr(addDays(easter, 1)),   // Poniedziałek Wielkanocny
        toDateStr(addDays(easter, 49)),  // Zielone Świątki
        toDateStr(addDays(easter, 60)),  // Boże Ciało
    ]);
}

/** Human-readable Polish name for a fixed holiday (keyed by MM-DD). */
export const POLISH_HOLIDAY_NAMES: Record<string, string> = {
    '01-01': 'Nowy Rok',
    '01-06': 'Trzech Króli',
    '05-01': 'Święto Pracy',
    '05-03': 'Konstytucja 3 Maja',
    '08-15': 'Wniebowzięcie NMP',
    '11-01': 'Wszystkich Świętych',
    '11-11': 'Święto Niepodległości',
    '12-25': 'Boże Narodzenie',
    '12-26': 'Boże Narodzenie (2.)',
};

/** Returns true if the given YYYY-MM-DD date string is a weekend day. */
export function isWeekend(dateStr: string): boolean {
    const d = new Date(dateStr + 'T00:00:00');
    const dow = d.getDay(); // 0=Sunday, 6=Saturday
    return dow === 0 || dow === 6;
}
