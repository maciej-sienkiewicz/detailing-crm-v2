import { describe, expect, it } from 'vitest';
import { outstandingTile } from './outstandingTile';
import type { FinanceSummary } from '../types';

const summary = (patch: Partial<FinanceSummary> = {}): FinanceSummary => ({
    dateFrom: '2026-09-01', dateTo: '2026-09-30',
    totalRevenue: 0, totalCosts: 0, profit: 0,
    pendingReceivables: 100_000, pendingPayables: 20_000,
    pendingReceivablesGross: 123_000, pendingPayablesGross: 24_600,
    overdueReceivables: 0, overduePayables: 0,
    ...patch,
});

describe('kafel należności / zobowiązań', () => {
    it('nad przychodami: ile klienci są winni, brutto', () => {
        expect(outstandingTile(summary(), 'receivables')).toEqual({
            label: 'Należności', amountCents: 123_000, note: 'brutto, klienci jeszcze nie zapłacili',
        });
    });

    it('nad kosztami: ile studio jest winne, brutto', () => {
        expect(outstandingTile(summary(), 'payables')).toEqual({
            label: 'Zobowiązania', amountCents: 24_600, note: 'brutto, jeszcze nie zapłaciłeś',
        });
    });

    it('dokumenty po terminie to liczba, nie kwota - każda strona swoje', () => {
        const s = summary({ overdueReceivables: 3, overduePayables: 1 });
        expect(outstandingTile(s, 'receivables').note).toBe('brutto, w tym 3 dokumenty po terminie');
        expect(outstandingTile(s, 'payables').note).toBe('brutto, w tym 1 dokument po terminie');
    });

    it('starszy serwer bez brutto: netto, z takim podpisem', () => {
        const s = summary({ pendingReceivablesGross: undefined, pendingPayablesGross: undefined });
        expect(outstandingTile(s, 'receivables')).toMatchObject({ amountCents: 100_000, note: 'netto, klienci jeszcze nie zapłacili' });
        expect(outstandingTile(s, 'payables')).toMatchObject({ amountCents: 20_000, note: 'netto, jeszcze nie zapłaciłeś' });
    });
});
