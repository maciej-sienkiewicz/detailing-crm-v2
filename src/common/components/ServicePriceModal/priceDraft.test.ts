// Okno „Cena w tej rezerwacji": z trzech zakładek powstaje jeden rabat pozycji.
// Pilnuje CLAUDE.md §1 - cena wpisana jako brutto zostaje brutto co do grosza.
import { describe, expect, it } from 'vitest';
import {
    changeLabel, describeChange, fromDiscount, fromSurcharge, fromTypedPrice, initialMode, priceAfter,
    type PriceBase,
} from './priceDraft';

/** 1900,00 zł wpisane od strony brutto: 154472 × 1,23 = 190001, więc brutto nie wynika z netta. */
const typedGross: PriceBase = { netCents: 154_472, exactGrossCents: 190_000, vatRate: 23 };
/** Pozycja z cennika liczona od netta. */
const fromNet: PriceBase = { netCents: 10_000, vatRate: 23 };

describe('priceDraft - „Ustal cenę"', () => {
    it('wpisane brutto idzie jako SET_GROSS i zostaje dokładne', () => {
        const adj = fromTypedPrice({ side: 'gross', raw: '1900' });
        expect(adj).toEqual({ type: 'SET_GROSS', value: 190_000 });
        expect(priceAfter(fromNet, adj!).finalGrossCents).toBe(190_000);
    });

    it('wpisane netto idzie jako SET_NET', () => {
        expect(fromTypedPrice({ side: 'net', raw: '150,50' })).toEqual({ type: 'SET_NET', value: 15_050 });
    });

    it('puste albo zerowe pole nie jest ceną', () => {
        expect(fromTypedPrice({ side: 'gross', raw: '' })).toBeNull();
        expect(fromTypedPrice({ side: 'gross', raw: '0' })).toBeNull();
        expect(fromTypedPrice(null)).toBeNull();
    });
});

describe('priceDraft - „Rabat"', () => {
    it('procent jest ujemny, kwoty są odejmowane (v > 0 = rabat)', () => {
        expect(fromDiscount('percent', '10', fromNet)).toEqual({ type: 'PERCENT', value: -10 });
        expect(fromDiscount('gross', '100', typedGross)).toEqual({ type: 'FIXED_GROSS', value: 10_000 });
        expect(fromDiscount('net', '20', fromNet)).toEqual({ type: 'FIXED_NET', value: 2_000 });
    });

    it('rabat większy niż cena nie przechodzi', () => {
        expect(fromDiscount('percent', '101', fromNet)).toBeNull();
        expect(fromDiscount('gross', '1900,01', typedGross)).toBeNull();
        expect(fromDiscount('net', '100,01', fromNet)).toBeNull();
    });
});

describe('priceDraft - „Dopłata"', () => {
    it('kwota brutto doliczana do dokładnego brutta: 1900,00 + 300,00 = 2200,00 zł', () => {
        const adj = fromSurcharge('gross', '300', typedGross);
        expect(adj).toEqual({ type: 'SET_GROSS', value: 220_000 });
        expect(priceAfter(typedGross, adj!).finalGrossCents).toBe(220_000);
    });

    it('kwota netto doliczana do netta', () => {
        expect(fromSurcharge('net', '50', fromNet)).toEqual({ type: 'SET_NET', value: 15_000 });
    });

    it('procent jest dodatni', () => {
        expect(fromSurcharge('percent', '10', fromNet)).toEqual({ type: 'PERCENT', value: 10 });
        expect(priceAfter(fromNet, { type: 'PERCENT', value: 10 }).finalNetCents).toBe(11_000);
    });
});

describe('priceDraft - opis zmiany', () => {
    it('kierunek decyduje o słowie, niezależnie od rodzaju rabatu', () => {
        expect(changeLabel(describeChange(typedGross, { type: 'SET_GROSS', value: 220_000 }))).toBe('Dopłata 300,00 zł');
        expect(changeLabel(describeChange(typedGross, { type: 'SET_GROSS', value: 180_000 }))).toBe('Rabat 100,00 zł');
        expect(changeLabel(describeChange(fromNet, { type: 'PERCENT', value: -12.5 }))).toBe('Rabat 12,5%');
        expect(changeLabel(describeChange(fromNet, { type: 'PERCENT', value: 10 }))).toBe('Dopłata 10%');
    });

    it('rabat zerowy i cena równa wyjściowej to brak zmiany', () => {
        expect(describeChange(typedGross, { type: 'PERCENT', value: 0 }).kind).toBe('none');
        expect(describeChange(typedGross, { type: 'SET_GROSS', value: 190_000 }).kind).toBe('none');
        expect(changeLabel(describeChange(typedGross, null))).toBeNull();
    });

    it('okno otwiera się w zakładce, w której zapisano zmianę', () => {
        expect(initialMode(null)).toBe('price');
        expect(initialMode({ type: 'PERCENT', value: 0 })).toBe('price');
        expect(initialMode({ type: 'PERCENT', value: -10 })).toBe('discount');
        expect(initialMode({ type: 'FIXED_GROSS', value: 500 })).toBe('discount');
        expect(initialMode({ type: 'PERCENT', value: 10 })).toBe('surcharge');
        expect(initialMode({ type: 'SET_GROSS', value: 220_000 })).toBe('price');
    });
});
