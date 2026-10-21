import { describe, expect, it } from 'vitest';
import { legacyReportLink } from './legacyReportLink';

describe('legacyReportLink', () => {
    it('stary link z powiadomienia prowadzi na zakładkę Raporty z tą samą długością okresu', () => {
        expect(legacyReportLink(new URLSearchParams('raport=WEEK&od=2026-10-12'))).toBe('/statistics/reports?okres=tydzien');
        expect(legacyReportLink(new URLSearchParams('raport=TWO_WEEKS&od=2026-10-05'))).toBe('/statistics/reports?okres=2-tygodnie');
        expect(legacyReportLink(new URLSearchParams('raport=MONTH&od=2026-09-01'))).toBe('/statistics/reports?okres=miesiac');
    });

    it('nieznana długość - sama zakładka Raporty', () => {
        expect(legacyReportLink(new URLSearchParams('raport=YEAR'))).toBe('/statistics/reports');
    });

    it('zwykłe wejście w Statystyki zostaje na miejscu', () => {
        expect(legacyReportLink(new URLSearchParams(''))).toBeNull();
    });
});
