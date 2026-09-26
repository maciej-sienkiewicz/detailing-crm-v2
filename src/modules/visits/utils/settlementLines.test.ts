import { describe, expect, it } from 'vitest';
import {
    changedServiceLines, lineFromService, totalGrossCents, withLineGross, withLineNet, withLineVatRate,
} from './settlementLines';

const service = (patch = {}) => ({
    id: 's-1', name: 'Przygotowanie do sprzedaży', vatRate: 23,
    netCents: 154_472, grossCents: 190_000, grossTyped: true, ...patch,
});

describe('pozycje poprawki rozliczenia', () => {
    it('brutto wpisane 1900,00 zł przechodzi 23% → 8% → 23% co do grosza', () => {
        const line = lineFromService(service());
        const back = withLineVatRate(withLineVatRate(line, 8), 23);
        expect(back.gross).toBe('1900,00');
        expect(changedServiceLines([back])).toEqual([]);
    });

    it('cena od strony netta trzyma netto przy zmianie stawki', () => {
        const line = lineFromService(service({ netCents: 50_000, grossCents: 61_500, grossTyped: false }));
        const at8 = withLineVatRate(line, 8);
        expect(at8.net).toBe('500,00');
        expect(at8.gross).toBe('540,00');
    });

    it('do API idą tylko zmienione pozycje, brutto tylko gdy wpisane', () => {
        const byGross = withLineGross(lineFromService(service()), '1700');
        const byNet = withLineNet(lineFromService(service({ id: 's-2' })), '1000');
        expect(changedServiceLines([byGross, byNet])).toEqual([
            { serviceLineItemId: 's-1', netCents: 138_211, grossCents: 170_000, vatRate: 23 },
            { serviceLineItemId: 's-2', netCents: 100_000, grossCents: null, vatRate: 23 },
        ]);
        expect(totalGrossCents([byGross])).toBe(170_000);
    });
});
