// Decyzje cenowe wspólnej tabeli usług (przyjęcie pojazdu, edycja rezerwacji,
// szybka rezerwacja z kalendarza, wycena leada).
//
// Regresja, której pilnuje ten plik: pozycja z ceną ręczną wraca z API jako
// `basePriceNet = 0` + SET_NET/SET_GROSS. Rabat liczony od surowego `basePriceNet`
// zerował jej cenę, a „Usuń rabat" robił z niej usługę za 0 zł. Cena wpisana jako
// 1900,00 zł brutto (23% VAT: 154472 gr netto, a 154472 × 1,23 = 190001) ma przy
// tym zostać DOKŁADNIE 190000 - nie może być odtworzona z netta (CLAUDE.md §1).
import { describe, expect, it } from 'vitest';
import { applyAdjustment, distributeAdjustment, netToGross } from '@/common/utils/priceAdjustment';
import type { PriceAdjustment } from '@/common/utils/priceAdjustment';
import { discountBases, editedPricePair, withAdjustment } from './servicesTablePricing';

const NET = 154_472;
const GROSS = 190_000;
const NO_DISCOUNT: PriceAdjustment = { type: 'PERCENT', value: 0 };

/** Tyle pozycji tabeli, ile dotykają te funkcje. */
type Line = { id: string; basePriceNet: number; basePriceGross?: number; vatRate: number; adjustment: PriceAdjustment };

/** Pozycja z ceną ręczną tak, jak wraca z API: cena siedzi w rabacie. */
const manualGrossLine = (): Line => ({
    id: 'line-manual',
    basePriceNet: 0,
    vatRate: 23,
    adjustment: { type: 'SET_GROSS', value: GROSS },
});

/** Zwykła pozycja z dokładnym brutto (katalog albo cena wpisana od brutto). */
const exactGrossLine = (): Line => ({
    id: 'line-exact',
    basePriceNet: NET,
    basePriceGross: GROSS,
    vatRate: 23,
    adjustment: NO_DISCOUNT,
});

const finalOf = (line: { basePriceNet: number; basePriceGross?: number; vatRate: number; adjustment: PriceAdjustment }) =>
    applyAdjustment(line.basePriceNet, line.vatRate, line.adjustment, line.basePriceGross);

describe('withAdjustment - cena ręczna (baza 0 + SET_*) nie znika przy rabacie', () => {
    it('rabat procentowy liczy się od ustalonej ceny, a nie od zera', () => {
        const line = withAdjustment(manualGrossLine(), { type: 'PERCENT', value: -10 });

        expect(line.basePriceNet).toBe(NET);
        expect(line.basePriceGross).toBe(GROSS);
        expect(line.adjustment).toEqual({ type: 'PERCENT', value: -10 });
        // 10% od 1544,72 zł netto, a nie od 0.
        expect(finalOf(line).finalNetCents).toBe(139_025);
    });

    it('„Usuń rabat" zostawia cenę wpisaną jako brutto dokładnie: 1900,00, nie 1900,01', () => {
        const line = withAdjustment(manualGrossLine(), NO_DISCOUNT);

        expect(line.basePriceNet).toBe(NET);
        expect(line.basePriceGross).toBe(GROSS);
        expect(finalOf(line)).toMatchObject({ finalNetCents: NET, finalGrossCents: GROSS });
    });

    it('upust brutto schodzi z wpisanego brutto: 1900,00 − 100,00 = 1800,00', () => {
        const line = withAdjustment(manualGrossLine(), { type: 'FIXED_GROSS', value: 10_000 });

        expect(finalOf(line).finalGrossCents).toBe(180_000);
    });

    it('cena ręczna podana w netto: netto przechodzi do bazy, brutto wolno policzyć', () => {
        const line = withAdjustment(
            { ...manualGrossLine(), adjustment: { type: 'SET_NET', value: 150_000 } },
            NO_DISCOUNT,
        );

        expect(line.basePriceNet).toBe(150_000);
        expect(line.basePriceGross).toBeUndefined();
        expect(finalOf(line).finalGrossCents).toBe(netToGross(150_000, 23));
    });

    it('zwykła pozycja zmienia tylko rabat - baza i dokładne brutto zostają', () => {
        const before = exactGrossLine();
        const line = withAdjustment(before, { type: 'FIXED_NET', value: 1_000 });

        expect(line).toEqual({ ...before, adjustment: { type: 'FIXED_NET', value: 1_000 } });
    });

    it('usługa darmowa (SET_GROSS 0) zostaje darmowa', () => {
        const line = withAdjustment({ ...manualGrossLine(), adjustment: { type: 'SET_GROSS', value: 0 } }, NO_DISCOUNT);

        expect(finalOf(line)).toMatchObject({ finalNetCents: 0, finalGrossCents: 0 });
    });
});

describe('discountBases - „Rabatuj wszystko" liczy od ustalonych cen', () => {
    it('pozycja z ceną ręczną wchodzi ustaloną ceną i dokładnym brutto, nie zerem', () => {
        expect(discountBases([manualGrossLine(), exactGrossLine()])).toEqual([
            { basePriceNetCents: NET, basePriceGrossCents: GROSS, vatRate: 23 },
            { basePriceNetCents: NET, basePriceGrossCents: GROSS, vatRate: 23 },
        ]);
    });

    it('pozycja bez dokładnego brutto nie dostaje zmyślonego - brutto policzy się z netta', () => {
        const [base] = discountBases([{ basePriceNet: 10_000, vatRate: 23, adjustment: NO_DISCOUNT }]);

        expect(base.basePriceGrossCents).toBeUndefined();
    });

    it('upust brutto rozłożony na obie pozycje daje równo 1800,00 zł na każdej', () => {
        const lines = [manualGrossLine(), exactGrossLine()];
        const adjustments = distributeAdjustment(discountBases(lines), 'FIXED_GROSS', 20_000);
        const discounted = lines.map((line, i) => withAdjustment(line, adjustments[i]));

        expect(discounted.map(line => finalOf(line).finalGrossCents)).toEqual([180_000, 180_000]);
    });

    it('cena brutto ustawiona na całość rozkłada się bez gubienia grosza', () => {
        const lines = [manualGrossLine(), exactGrossLine()];
        const adjustments = distributeAdjustment(discountBases(lines), 'SET_GROSS', 380_000);
        const discounted = lines.map((line, i) => withAdjustment(line, adjustments[i]));

        expect(discounted.map(line => finalOf(line).finalGrossCents)).toEqual([GROSS, GROSS]);
    });
});

describe('editedPricePair - para z „Edytuj pozycję" jest zawsze spójna', () => {
    it('wpisane brutto 1900,00 zostaje dokładne, netto liczy się od niego', () => {
        expect(editedPricePair('1900', 'gross', 23)).toEqual({ netCents: NET, grossCents: GROSS });
        expect(editedPricePair('1900,00', 'gross', 23)).toEqual({ netCents: NET, grossCents: GROSS });
    });

    it('wpisane netto zostaje dokładne, brutto liczy się od niego', () => {
        expect(editedPricePair('1544,72', 'net', 23)).toEqual({ netCents: NET, grossCents: 190_001 });
        expect(editedPricePair('100', 'net', 8)).toEqual({ netCents: 10_000, grossCents: 10_800 });
    });

    it('ZW: netto równa się brutto w obie strony', () => {
        expect(editedPricePair('123,45', 'gross', -1)).toEqual({ netCents: 12_345, grossCents: 12_345 });
        expect(editedPricePair('123,45', 'net', -1)).toEqual({ netCents: 12_345, grossCents: 12_345 });
    });

    it.each(['', '0', '0,00', ','])('pole „%s" zeruje OBIE kwoty - druga nie zostaje sprzed zmiany', raw => {
        expect(editedPricePair(raw, 'gross', 23)).toEqual({ netCents: 0, grossCents: 0 });
        expect(editedPricePair(raw, 'net', 23)).toEqual({ netCents: 0, grossCents: 0 });
    });
});
