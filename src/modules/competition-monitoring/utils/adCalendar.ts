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

// ─── Widok na telefon: miesiące zamiast osi dni ──────────────────────────────

/** Skróty jak na osi desktopu: trzy litery zamiast jednej, bo „S L M K M C L S W P L G" ma dwa S, trzy L i dwa M. */
export const MONTH_ABBR = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

export const MONTH_NAMES = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

export interface AdLike {
    adId: string;
    start: string;
    stop: string | null;
}

export interface MonthBucket<T extends AdLike = AdLike> {
    /** Suma dni każdej kampanii pokrywającej ten miesiąc - tak samo jak `sponsoredDays` z API. */
    daysInMonth: number;
    /** Kampanie z jakąkolwiek nakładką na miesiąc, posortowane po dacie startu. */
    ads: T[];
}

/**
 * Rozłożenie kampanii profilu na 12 miesięcy: łączne dni reklam (dokładnie tak,
 * jak liczy backend - kampanie równoległe liczą się osobno) i lista kampanii
 * do panelu miesiąca. Przyszłości nie liczymy: w bieżącym roku odcinamy na dziś.
 */
export const bucketAdsByMonth = <T extends AdLike>(ads: T[], year: number, today: string): MonthBucket<T>[] => {
    const starts = monthStartDays(year);
    const length = yearLength(year);
    const inYear = (iso: string) => iso.startsWith(`${year}-`);
    const lastDayInYear = inYear(today) ? dayOfYear(today) : length;
    const ends = starts.map((_, i) => (i + 1 < starts.length ? starts[i + 1] - 1 : length));

    const buckets: MonthBucket<T>[] = Array.from({ length: 12 }, () => ({ daysInMonth: 0, ads: [] }));

    ads.forEach(ad => {
        const fromDay = inYear(ad.start) ? dayOfYear(ad.start) : 1;
        const rawStop = ad.stop && inYear(ad.stop) ? dayOfYear(ad.stop) : lastDayInYear;
        const toDay = Math.min(rawStop, lastDayInYear);
        if (toDay < fromDay) return;

        for (let m = 0; m < 12; m += 1) {
            const overlapStart = Math.max(fromDay, starts[m]);
            const overlapEnd = Math.min(toDay, ends[m]);
            if (overlapEnd >= overlapStart) {
                buckets[m].daysInMonth += overlapEnd - overlapStart + 1;
                buckets[m].ads.push(ad);
            }
        }
    });

    buckets.forEach(bucket => bucket.ads.sort((a, b) => a.start.localeCompare(b.start)));
    return buckets;
};

/** Indeks bieżącego miesiąca (0-11) albo -1, gdy kalendarz pokazuje inny rok. */
export const currentMonthIndex = (year: number, today: string): number =>
    today.startsWith(`${year}-`) ? new Date(`${today}T00:00:00Z`).getUTCMonth() : -1;

/** Kampania trwa, gdy nie ma końca albo kończy się dziś lub później. */
export const isAdRunning = (ad: AdLike, today: string): boolean => !ad.stop || ad.stop >= today;

const shortDay = (iso: string): string => {
    const date = new Date(`${iso}T00:00:00Z`);
    return `${date.getUTCDate()} ${MONTH_ABBR[date.getUTCMonth()]}`;
};

/** „21 mar – 25 mar", „12 maj" albo „trwa od 22 wrz". */
export const formatAdRange = (start: string, stop: string | null): string => {
    if (!stop) return `trwa od ${shortDay(start)}`;
    if (start === stop) return shortDay(start);
    return `${shortDay(start)} – ${shortDay(stop)}`;
};

/** Opis trwającej kampanii: „trwa od 22 wrz" albo „do 18 paź", gdy reklamodawca ustawił koniec. */
export const runningAdLabel = (ad: AdLike): string =>
    ad.stop ? `do ${shortDay(ad.stop)}` : `trwa od ${shortDay(ad.start)}`;
