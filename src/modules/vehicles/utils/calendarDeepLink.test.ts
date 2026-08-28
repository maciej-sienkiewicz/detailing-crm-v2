import { describe, it, expect } from 'vitest';
import { toCalendarDate } from './calendarDeepLink';

describe('toCalendarDate', () => {
    it('zwraca datę w formacie, którego szuka kalendarz', () => {
        expect(toCalendarDate('2026-08-27T10:30:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('trzyma się daty lokalnej, nie UTC', () => {
        // Godzina 01:00 czasu lokalnego to poprzedni dzień w UTC dla stref
        // dodatnich — kafelek kalendarza ma być ten, który widzi użytkownik.
        const local = new Date(2026, 7, 27, 1, 0, 0);
        expect(toCalendarDate(local.toISOString())).toBe('2026-08-27');
    });

    it('dopełnia miesiąc i dzień do dwóch cyfr', () => {
        expect(toCalendarDate(new Date(2026, 0, 5, 12).toISOString())).toBe('2026-01-05');
    });

    it('niepoprawna data daje pusty ciąg, a nie NaN w adresie', () => {
        expect(toCalendarDate('')).toBe('');
        expect(toCalendarDate('nie-data')).toBe('');
    });
});
