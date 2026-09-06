/**
 * Geometria kalendarza reklam: zamiana dat kampanii na pozycję paska w roku.
 *
 * Osobny plik, bo to jedyne miejsce w tej zakładce, w którym łatwo pomylić się
 * o jeden dzień, a najtaniej to sprawdzić testem - reszta komponentu tylko rysuje.
 */

export interface BarGeometry {
    /** Lewa krawędź paska w procentach szerokości roku. */
    left: number;
    width: number;
}

export const isLeapYear = (year: number): boolean =>
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export const yearLength = (year: number): number => (isLeapYear(year) ? 366 : 365);

/** 1 dla 1 stycznia. Liczymy w UTC, bo daty z API to gołe dni bez strefy. */
export const dayOfYear = (iso: string): number => {
    const date = new Date(`${iso}T00:00:00Z`);
    const start = Date.UTC(date.getUTCFullYear(), 0, 1);
    return Math.floor((date.getTime() - start) / 86_400_000) + 1;
};

/** Dzień, w którym zaczyna się każdy miesiąc (1-based, w dobach od początku roku). */
export const monthStartDays = (year: number): number[] => {
    const starts: number[] = [];
    let day = 1;
    for (let month = 0; month < 12; month += 1) {
        starts.push(day);
        day += new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }
    return starts;
};

/**
 * Pasek przycięty do roku kalendarza.
 *
 * Kampania z poprzedniego roku zaczyna się przy lewej krawędzi, a trwająca kończy
 * się na dzisiaj - kalendarz nie rysuje przyszłości, bo jej jeszcze nie było.
 * Kampania jednodniowa dostaje minimalną szerokość: 1/365 to ćwierć piksela,
 * czyli pasek, którego nie da się ani zobaczyć, ani kliknąć.
 */
export const barGeometry = (
    start: string,
    stop: string | null,
    year: number,
    today: string
): BarGeometry => {
    const length = yearLength(year);
    const inYear = (iso: string) => iso.startsWith(`${year}-`);

    const lastDay = inYear(today) ? dayOfYear(today) : length;
    const from = inYear(start) ? dayOfYear(start) : 1;
    const to = Math.min(stop && inYear(stop) ? dayOfYear(stop) : lastDay, lastDay);

    const left = ((from - 1) / length) * 100;
    const width = Math.max(((Math.max(to, from) - from + 1) / length) * 100, 0.5);
    return { left, width: Math.min(width, 100 - left) };
};
