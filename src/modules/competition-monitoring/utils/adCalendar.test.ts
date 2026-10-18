import { describe, expect, it } from 'vitest';
import {
    barGeometry,
    bucketAdsByMonth,
    currentMonthIndex,
    dayOfYear,
    formatAdRange,
    isAdRunning,
    monthStartDays,
    runningAdLabel,
    yearLength,
} from './adCalendar';

/**
 * Kalendarz reklam jest jedynym miejscem, gdzie data zamienia się na piksele.
 * Błąd o jeden dzień nie wywraca aplikacji - po prostu rysuje kampanię obok
 * miesiąca, w którym się odbyła, i nikt tego nie zauważy bez testu.
 */
describe('geometria kalendarza reklam', () => {
    const YEAR = 2026;
    const TODAY = '2026-09-06';

    it('1 stycznia to pierwszy dzień roku', () => {
        expect(dayOfYear('2026-01-01')).toBe(1);
    });

    it('rok przestępny ma 366 dni, a 1 marca wypada o dzień później', () => {
        expect(yearLength(2024)).toBe(366);
        expect(yearLength(2026)).toBe(365);
        expect(dayOfYear('2024-03-01')).toBe(dayOfYear('2026-03-01') + 1);
    });

    it('miesiące zaczynają się w tych samych dniach co w kalendarzu', () => {
        expect(monthStartDays(2026)).toEqual([1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]);
        // Luty w roku przestępnym przesuwa wszystko od marca o jeden dzień.
        expect(monthStartDays(2024)[2]).toBe(61);
    });

    it('kampania zaczyna się dokładnie tam, gdzie jej data', () => {
        const bar = barGeometry('2026-07-12', '2026-07-12', YEAR, TODAY);
        expect(bar.left).toBeCloseTo(((dayOfYear('2026-07-12') - 1) / 365) * 100, 5);
    });

    it('trwająca kampania kończy się na dzisiaj, a nie na końcu roku', () => {
        const running = barGeometry('2026-09-01', null, YEAR, TODAY);
        const ended = barGeometry('2026-09-01', '2026-09-06', YEAR, TODAY);
        expect(running.width).toBeCloseTo(ended.width, 5);
        expect(running.left + running.width).toBeLessThan(100);
    });

    it('kampania z poprzedniego roku zaczyna się przy lewej krawędzi', () => {
        const bar = barGeometry('2025-12-20', '2026-01-10', YEAR, TODAY);
        expect(bar.left).toBe(0);
        expect(bar.width).toBeCloseTo((10 / 365) * 100, 5);
    });

    it('kampania jednodniowa zostaje widoczna mimo znikomej szerokości', () => {
        const bar = barGeometry('2026-05-10', '2026-05-10', YEAR, TODAY);
        expect(bar.width).toBeGreaterThanOrEqual(0.5);
    });

    it('pasek nigdy nie wychodzi poza prawą krawędź roku', () => {
        const bar = barGeometry('2026-12-30', null, YEAR, '2026-12-31');
        expect(bar.left + bar.width).toBeLessThanOrEqual(100);
    });
});

/**
 * Histogram na telefonie liczy dni reklam w każdym miesiącu. Suma ma się zgadzać
 * z `sponsoredDays` z serwera - inaczej słupki i zdanie „161 dni reklam" nad nimi
 * opowiadają dwie różne historie.
 */
describe('miesiące kalendarza reklam na telefonie', () => {
    const YEAR = 2026;
    const TODAY = '2026-10-17';
    const ad = (adId: string, start: string, stop: string | null) => ({ adId, start, stop });

    it('kampania 21-25 marca to 5 dni w marcu i nic poza nim', () => {
        const buckets = bucketAdsByMonth([ad('a', '2026-03-21', '2026-03-25')], YEAR, TODAY);
        expect(buckets[2].daysInMonth).toBe(5);
        expect(buckets.filter(bucket => bucket.daysInMonth > 0)).toHaveLength(1);
    });

    it('kampania przez koniec miesiąca dzieli dni między oba miesiące', () => {
        const buckets = bucketAdsByMonth([ad('a', '2026-03-31', '2026-04-27')], YEAR, TODAY);
        expect(buckets[2].daysInMonth).toBe(1);
        expect(buckets[3].daysInMonth).toBe(27);
        expect(buckets[2].ads.map(a => a.adId)).toEqual(['a']);
        expect(buckets[3].ads.map(a => a.adId)).toEqual(['a']);
    });

    it('kampania z grudnia poprzedniego roku liczy się od 1 stycznia', () => {
        const buckets = bucketAdsByMonth([ad('a', '2025-12-20', '2026-01-10')], YEAR, TODAY);
        expect(buckets[0].daysInMonth).toBe(10);
    });

    it('trwająca kampania kończy się na dzisiaj, przyszłe miesiące są puste', () => {
        const buckets = bucketAdsByMonth([ad('a', '2026-10-11', null)], YEAR, TODAY);
        expect(buckets[9].daysInMonth).toBe(7);
        expect(buckets[10].daysInMonth).toBe(0);
        expect(buckets[11].daysInMonth).toBe(0);
    });

    it('kampanie równoległe liczą się osobno i leżą w kolejności startu', () => {
        const buckets = bucketAdsByMonth(
            [ad('b', '2026-05-10', '2026-05-12'), ad('a', '2026-05-01', '2026-05-12')],
            YEAR,
            TODAY
        );
        expect(buckets[4].daysInMonth).toBe(3 + 12);
        expect(buckets[4].ads.map(a => a.adId)).toEqual(['a', 'b']);
    });

    it('bieżący miesiąc istnieje tylko w bieżącym roku', () => {
        expect(currentMonthIndex(2026, TODAY)).toBe(9);
        expect(currentMonthIndex(2025, TODAY)).toBe(-1);
    });

    it('kampania trwa bez daty końca albo do dziś włącznie', () => {
        expect(isAdRunning(ad('a', '2026-10-01', null), TODAY)).toBe(true);
        expect(isAdRunning(ad('a', '2026-10-01', TODAY), TODAY)).toBe(true);
        expect(isAdRunning(ad('a', '2026-10-01', '2026-10-16'), TODAY)).toBe(false);
    });

    it('opisy dat mówią po polsku, od kiedy i do kiedy', () => {
        expect(formatAdRange('2026-03-21', '2026-03-25')).toBe('21 mar – 25 mar');
        expect(formatAdRange('2026-05-12', '2026-05-12')).toBe('12 maj');
        expect(formatAdRange('2026-09-22', null)).toBe('trwa od 22 wrz');
        expect(runningAdLabel(ad('a', '2026-09-22', null))).toBe('trwa od 22 wrz');
        expect(runningAdLabel(ad('a', '2026-10-01', '2026-10-18'))).toBe('do 18 paź');
    });
});
