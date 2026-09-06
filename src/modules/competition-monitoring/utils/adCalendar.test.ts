import { describe, expect, it } from 'vitest';
import { barGeometry, dayOfYear, monthStartDays, yearLength } from './adCalendar';

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
