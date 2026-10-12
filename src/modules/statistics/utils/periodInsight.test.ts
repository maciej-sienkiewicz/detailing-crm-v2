// Arytmetyka panelu „Szczegóły okresu": daty okresu po ludzku, porównanie ze zwykłym
// okresem i skład sprzedaży.
import { describe, expect, it } from 'vitest';
import {
    comparePeriod,
    composition,
    isAboutTheSame,
    periodBounds,
    periodCoverage,
    periodTitle,
} from './periodInsight';
import type { StatsDataPoint } from '../types';

const point = (period: string, orderCount: number, totalRevenueGross: number): StatsDataPoint =>
    ({ period, orderCount, totalRevenueGross });

describe('periodBounds i periodTitle', () => {
    it('tydzień ISO zaczyna się w poniedziałek, także na przełomie roku', () => {
        expect(periodBounds('2026-W41', 'WEEKLY')).toEqual({ start: '2026-10-05', end: '2026-10-11' });
        expect(periodBounds('2026-W01', 'WEEKLY')).toEqual({ start: '2025-12-29', end: '2026-01-04' });
    });

    it('tytuł mówi, jakie to dni, zamiast klucza „2026-W41"', () => {
        expect(periodTitle('2026-W41', 'WEEKLY')).toBe('Tydzień 5–11 października 2026');
        expect(periodTitle('2026-W40', 'WEEKLY')).toBe('Tydzień 28 września – 4 października 2026');
        expect(periodTitle('2026-W01', 'WEEKLY')).toBe('Tydzień 29 grudnia 2025 – 4 stycznia 2026');
        expect(periodTitle('2026-10-07', 'DAILY')).toBe('Środa, 7 października 2026');
        expect(periodTitle('2026-10', 'MONTHLY')).toBe('Październik 2026');
        expect(periodTitle('2026-Q3', 'QUARTERLY')).toBe('Lipiec–wrzesień 2026');
        expect(periodTitle('2026', 'YEARLY')).toBe('Rok 2026');
    });

    it('nierozpoznany klucz zostaje sobą, zamiast wywrócić panel', () => {
        expect(periodTitle('coś', 'WEEKLY')).toBe('coś');
    });

    it('ostatni dzień lutego w roku przestępnym', () => {
        expect(periodBounds('2028-02', 'MONTHLY')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
    });
});

describe('periodCoverage', () => {
    const range = ['2026-07-15', '2026-10-12', '2026-10-12'] as const;

    it('okres, który trwa (także w swoim ostatnim dniu), nie jest pełny', () => {
        expect(periodCoverage('2026-W42', 'WEEKLY', ...range)).toEqual({ kind: 'ongoing', until: '2026-10-12' });
        expect(periodCoverage('2026-W41', 'WEEKLY', '2026-07-15', '2026-10-11', '2026-10-11'))
            .toEqual({ kind: 'ongoing', until: '2026-10-11' });
    });

    it('tydzień ucięty początkiem zakresu jest niepełny', () => {
        expect(periodCoverage('2026-W29', 'WEEKLY', ...range)).toEqual({ kind: 'clipped', from: '2026-07-15', to: '2026-07-19' });
    });

    it('tydzień w środku zakresu jest pełny', () => {
        expect(periodCoverage('2026-W35', 'WEEKLY', ...range)).toEqual({ kind: 'full' });
    });
});

describe('comparePeriod', () => {
    // Zgłoszenie właściciela: tydzień 11 wizyt i 25 860 zł, zwykle ok. 7 wizyt i 13 500 zł.
    const series = [
        point('W1', 7, 1350000),
        point('W2', 6, 1180000),
        point('W3', 8, 1520000),
        point('W4', 7, 1400000),
        point('W5', 11, 2586000),
    ];
    const all = () => true;

    it('zwykły okres: mediana wizyt razy średnia ważona wizyty', () => {
        const c = comparePeriod(series, 'W5', all)!;
        expect(c.basis).toBe('typical');
        expect(c.refCount).toBe(7);
        // (1350000 + 1180000 + 1520000 + 1400000) / 28 wizyt = średnia wizyta
        expect(c.refRevenue).toBe(Math.round(7 * (5450000 / 28)));
        expect(c.diff).toBe(2586000 - c.refRevenue);
    });

    it('jedna droga wizyta nie wypacza „zwykłej" liczby wizyt', () => {
        const spiky = [point('A', 7, 1300000), point('B', 7, 1300000), point('C', 7, 1300000), point('D', 30, 9000000), point('E', 7, 1300000)];
        expect(comparePeriod(spiky, 'E', all)!.refCount).toBe(7);
    });

    it('okresy niepełne nie wchodzą do odniesienia ani nie dostają porównania', () => {
        expect(comparePeriod(series, 'W5', p => p !== 'W5')).toBeNull();
        const c = comparePeriod(series, 'W5', p => p !== 'W1')!;
        expect(c.basis).toBe('previous'); // zostały 3 pełne okresy - za mało na „zwykły"
        expect(c.refRevenue).toBe(1400000);
    });

    it('przy za małej liczbie okresów porównuje z poprzednim, a bez niego - wcale', () => {
        const short = [point('A', 5, 1000000), point('B', 6, 1300000)];
        expect(comparePeriod(short, 'B', all)).toMatchObject({ basis: 'previous', refRevenue: 1000000, diff: 300000 });
        expect(comparePeriod(short, 'A', all)).toBeNull();
    });

    it('różnica do 5% to „tyle co zwykle"', () => {
        const same = [...series.slice(0, 4), point('W5', 7, 1400000)];
        expect(isAboutTheSame(comparePeriod(same, 'W5', all)!)).toBe(true);
        expect(isAboutTheSame(comparePeriod(series, 'W5', all)!)).toBe(false);
    });
});

describe('composition', () => {
    const categories = [
        { categoryId: 'cer', categoryName: 'Powłoki ceramiczne', color: '#8B5CF6' },
        { categoryId: 'myc', categoryName: 'Mycie', color: '#10B981' },
    ];
    const visits = [
        { services: [
            { serviceName: 'Powłoka 5 lat', priceGross: 359000, categoryId: 'cer', inCategory: true },
            { serviceName: 'Mycie detailingowe', priceGross: 25000, categoryId: 'myc', inCategory: false },
        ] },
        { services: [
            { serviceName: 'Powłoka 3 lata', priceGross: 249000, categoryId: 'cer', inCategory: true },
            { serviceName: 'Wycieraczka', priceGross: 20000, categoryId: null, inCategory: false },
        ] },
    ];

    it('bez filtra: kategorie z kwotą, reszta jako „Bez kategorii"', () => {
        expect(composition(visits, categories, false)).toEqual([
            { key: 'cat:cer', name: 'Powłoki ceramiczne', color: '#8B5CF6', amount: 608000 },
            { key: 'cat:myc', name: 'Mycie', color: '#10B981', amount: 25000 },
            { key: 'none', name: 'Bez kategorii', color: null, amount: 20000 },
        ]);
    });

    it('z filtrem: tylko usługi tej kategorii, suma równa sprzedaży kategorii', () => {
        const rows = composition(visits, categories, true);
        expect(rows.map(r => r.name)).toEqual(['Powłoka 5 lat', 'Powłoka 3 lata']);
        expect(rows.every(r => r.color === '#8B5CF6')).toBe(true);
        expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(608000);
    });
});
