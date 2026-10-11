import { describe, it, expect } from 'vitest';
import { invoiceDraftTotals } from './invoiceDraftTotals';
import { inputValueToGrosze } from './formatters';
import type { RevenueVatRate } from '../types';

// Dawna arytmetyka okna „Wystaw fakturę” (VAT_MULTIPLIER). Trzymana tu tylko jako
// wzorzec porównania: przejście na netToGross nie mogło zmienić żadnej kwoty
// dla ceny wpisanej w netto.
const LEGACY_MULTIPLIER: Record<RevenueVatRate, number> = { '23': 0.23, '8': 0.08, '5': 0.05, '0': 0, zw: 0 };
const legacyTotals = (items: { quantity: string; price: string; vatRate: RevenueVatRate }[]) => {
  let net = 0;
  let vat = 0;
  for (const item of items) {
    const qty = parseFloat(item.quantity.replace(',', '.')) || 0;
    const lineNet = Math.round(inputValueToGrosze(item.price) * qty);
    net += lineNet;
    vat += Math.round(lineNet * LEGACY_MULTIPLIER[item.vatRate]);
  }
  return { net, vat, gross: net + vat };
};

const cents = (n: number) => (n / 100).toFixed(2);

describe('invoiceDraftTotals', () => {
  it('cena netto 1544,72 zł przy 23% daje 1900,01 zł brutto (kierunek netto → brutto)', () => {
    expect(invoiceDraftTotals([{ quantity: '1', price: '1544,72', vatRate: '23' }]))
      .toEqual({ net: 154472, vat: 35529, gross: 190001 });
  });

  it('VAT to różnica sum, więc netto + VAT = brutto', () => {
    const t = invoiceDraftTotals([
      { quantity: '3',   price: '19,99', vatRate: '23' },
      { quantity: '1,5', price: '80',    vatRate: '8' },
      { quantity: '2',   price: '12,35', vatRate: '5' },
    ]);
    expect(t.net + t.vat).toBe(t.gross);
  });

  it('„zw" i „0" nie doliczają VAT', () => {
    expect(invoiceDraftTotals([
      { quantity: '1', price: '100', vatRate: 'zw' },
      { quantity: '2', price: '50',  vatRate: '0' },
    ])).toEqual({ net: 20000, vat: 0, gross: 20000 });
  });

  it('puste i błędne pola liczą się jako zero', () => {
    expect(invoiceDraftTotals([{ quantity: '', price: '', vatRate: '23' }]))
      .toEqual({ net: 0, vat: 0, gross: 0 });
  });

  it('daje te same kwoty co dawna arytmetyka (VAT_MULTIPLIER) dla każdego netto do 2000 zł', () => {
    for (const vatRate of ['23', '8', '5', '0', 'zw'] as RevenueVatRate[]) {
      for (let n = 0; n <= 200_000; n++) {
        const items = [{ quantity: '1', price: cents(n), vatRate }];
        const actual = invoiceDraftTotals(items);
        const expected = legacyTotals(items);
        if (actual.gross !== expected.gross || actual.vat !== expected.vat) {
          throw new Error(`różnica przy ${n} gr / ${vatRate}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`);
        }
      }
    }
  });

  it('daje te same kwoty co dawna arytmetyka przy ilościach ułamkowych i kilku pozycjach', () => {
    const items = [
      { quantity: '2,5',  price: '333,33', vatRate: '23' as const },
      { quantity: '0,75', price: '41,10',  vatRate: '8'  as const },
      { quantity: '7',    price: '0,07',   vatRate: '5'  as const },
    ];
    expect(invoiceDraftTotals(items)).toEqual(legacyTotals(items));
  });
});
