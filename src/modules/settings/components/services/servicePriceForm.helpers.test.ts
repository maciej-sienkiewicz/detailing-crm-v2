import { describe, it, expect } from 'vitest';
import { parseMoneyInput } from '@/modules/services/utils/priceCalculator';
import { grossToNet } from '@/common/utils/priceAdjustment';
import { priceInputsForVatRate, storedPriceSide } from '@/common/utils/priceInputs';
import {
    formatDecimalInput, SERVICE_PRICE_INPUT,
    changeVat, packagesToRename, priceError, priceFieldsFromCatalog, pricePayload, toggleManualPrice,
    typeGross, typeNet, EMPTY_PRICE_FIELDS,
} from './servicePriceForm.helpers';

/*
 * Formularz usługi i pakietu w Ustawieniach → Usługi. Tak liczył się payload
 * `{ basePriceNet, basePriceGross }`: parseMoneyInput na treści obu pól.
 */
const payload = (fields: { net: string; gross: string }) => ({
    basePriceNet: parseMoneyInput(fields.net),
    basePriceGross: parseMoneyInput(fields.gross),
});

describe('formatDecimalInput', () => {
    it('grosze → pole z przecinkiem i dwoma miejscami', () => {
        expect(formatDecimalInput(190000)).toBe('1900,00');
        expect(formatDecimalInput(154472)).toBe('1544,72');
        expect(formatDecimalInput(5)).toBe('0,05');
        expect(formatDecimalInput(0)).toBe('0,00');
    });
});

describe('SERVICE_PRICE_INPUT', () => {
    it('puste i zerowe pole to brak ceny - jak przy wpisywaniu', () => {
        expect(SERVICE_PRICE_INPUT.toCents('')).toBeNull();
        expect(SERVICE_PRICE_INPUT.toCents('0')).toBeNull();
        expect(SERVICE_PRICE_INPUT.toCents('0,00')).toBeNull();
        expect(SERVICE_PRICE_INPUT.toCents(',')).toBeNull();
    });

    it('kwota → grosze, w obie strony bez zmian', () => {
        expect(SERVICE_PRICE_INPUT.toCents('1900,00')).toBe(190000);
        expect(SERVICE_PRICE_INPUT.toCents('1900')).toBe(190000);
        expect(SERVICE_PRICE_INPUT.toCents(SERVICE_PRICE_INPUT.toInput(154472))).toBe(154472);
    });
});

describe('formularz cennika: zmiana stawki VAT', () => {
    const change = (fields: { net: string; gross: string }, from: number, to: number, side: 'net' | 'gross') =>
        priceInputsForVatRate(fields, from, to, side, SERVICE_PRICE_INPUT);

    it('brutto wpisane 1900,00 przy 23% → 8% → 23% wraca jako 190000 gr, nie 190001', () => {
        // Wpisano brutto „1900" - netto policzył handleGrossChange.
        const typed = { net: formatDecimalInput(grossToNet(190000, 23)), gross: '1900' };
        const at8 = change(typed, 23, 8, 'gross');
        expect(at8).toEqual({ net: '1759,26', gross: '1900' });

        const back = change(at8, 8, 23, 'gross');
        expect(payload(back)).toEqual({ basePriceNet: 154472, basePriceGross: 190000 });
    });

    it('usługa z katalogu z brutto wpisanym od strony brutto: zapisane brutto przeżywa zmianę', () => {
        const stored = { basePriceNet: 154472, basePriceGross: 190000, vatRate: 23 };
        // Tak otwiera się formularz edycji (serviceToForm/packageToForm).
        const fields = { net: formatDecimalInput(stored.basePriceNet), gross: formatDecimalInput(stored.basePriceGross) };
        const side = storedPriceSide(stored.basePriceNet, stored.basePriceGross, stored.vatRate);
        expect(side).toBe('gross');

        const back = change(change(fields, 23, 8, side), 8, 23, side);
        expect(payload(back).basePriceGross).toBe(190000);
    });

    it('wpisane netto zostaje, brutto liczy się przy nowej stawce', () => {
        expect(change({ net: '150,00', gross: '184,50' }, 23, 8, 'net')).toEqual({ net: '150,00', gross: '162,00' });
        // Usługa z katalogu, której pary nie da się rozstrzygnąć: dotychczasowe netto.
        expect(storedPriceSide(15000, 18450, 23)).toBe('net');
    });

    it('ta sama stawka: nic się nie przelicza', () => {
        const fields = { net: '1544,72', gross: '1900,00' };
        expect(change(fields, 23, 23, 'net')).toBe(fields);
        expect(change(fields, 23, 23, 'gross')).toBe(fields);
    });

    it('ZW: wpisana strona zostaje, druga jej równa', () => {
        expect(change({ net: '1544,72', gross: '1900,00' }, 23, -1, 'gross')).toEqual({ net: '1900,00', gross: '1900,00' });
        expect(change({ net: '150,00', gross: '184,50' }, 23, -1, 'net')).toEqual({ net: '150,00', gross: '150,00' });
    });

    it('zero albo puste pole wpisane czyści drugie, zamiast pokazywać 0,00', () => {
        expect(change({ net: '0', gross: '' }, 23, 8, 'net')).toEqual({ net: '0', gross: '' });
        expect(change({ net: '', gross: '' }, 23, 8, 'gross')).toEqual({ net: '', gross: '' });
    });
});

// ─── Pola ceny otwieranej usługi (audyt: brutto „0" i `null`) ─────────────────

describe('priceFieldsFromCatalog - brutto zapisane albo brak brutta', () => {
    const service = { basePriceNet: 154472, vatRate: 23 as const, requireManualPrice: false };

    it('1900,00 zł wpisane jako brutto: pole pokazuje 1900,00, strona brutto, zapis bez zmian daje 190000', () => {
        const fields = priceFieldsFromCatalog({ ...service, basePriceGross: 190000 });
        expect(fields.grossInput).toBe('1900,00');
        expect(fields.priceSide).toBe('gross');
        expect(pricePayload(fields)).toEqual({ basePriceNet: 154472, basePriceGross: 190000 });
    });

    it('brak brutta (null): brutto z netta, strona netto - zapis nie wysyła zera', () => {
        const fields = priceFieldsFromCatalog({ ...service, basePriceGross: null });
        expect(fields.priceSide).toBe('net');
        expect(pricePayload(fields)).toEqual({ basePriceNet: 154472, basePriceGross: 190001 });
    });

    it('brutto 0 zł przy netto > 0 to brak brutta, nie cena', () => {
        const fields = priceFieldsFromCatalog({ basePriceNet: 50000, basePriceGross: 0, vatRate: 23, requireManualPrice: false });
        expect(fields.grossInput).toBe('615,00');
        expect(fields.priceSide).toBe('net');
        expect(pricePayload(fields).basePriceGross).toBe(61500);
    });

    it('wycena ręczna: puste pola, para 0/0', () => {
        const fields = priceFieldsFromCatalog({ basePriceNet: 0, basePriceGross: 0, vatRate: 8, requireManualPrice: true });
        expect(fields).toMatchObject({ netInput: '', grossInput: '', requireManualPrice: true, vatRate: 8 });
        expect(pricePayload(fields)).toEqual({ basePriceNet: 0, basePriceGross: 0 });
    });

    it('brutto zapisane przeżywa 23% → 8% → 23% bez dotykania pól', () => {
        const fields = priceFieldsFromCatalog({ ...service, basePriceGross: 190000 });
        const back = changeVat(changeVat(fields, 8), 23);
        expect(pricePayload(back)).toEqual({ basePriceNet: 154472, basePriceGross: 190000 });
    });
});

describe('wpisywanie ceny', () => {
    it('wpisane brutto 1900 zostaje 190000, netto pochodne', () => {
        const fields = typeGross(EMPTY_PRICE_FIELDS, '1900');
        expect(fields).not.toBeNull();
        expect(pricePayload(fields!)).toEqual({ basePriceNet: 154472, basePriceGross: 190000 });
    });

    it('wpisane netto: brutto = netto × stawka', () => {
        expect(pricePayload(typeNet(EMPTY_PRICE_FIELDS, '500')!)).toEqual({ basePriceNet: 50000, basePriceGross: 61500 });
    });

    it('znak spoza kwoty jest odrzucany', () => {
        expect(typeGross(EMPTY_PRICE_FIELDS, '12a')).toBeNull();
        expect(typeNet(EMPTY_PRICE_FIELDS, '1,234')).toBeNull();
    });
});

describe('priceError - pusta cena to błąd, nie 0 zł', () => {
    it('puste pola przy usłudze bez wyceny ręcznej', () => {
        expect(priceError(EMPTY_PRICE_FIELDS)).toBeDefined();
        expect(priceError({ ...EMPTY_PRICE_FIELDS, netInput: ',' })).toBeDefined();
    });

    it('wycena ręczna nie potrzebuje ceny', () => {
        expect(priceError(toggleManualPrice(EMPTY_PRICE_FIELDS))).toBeUndefined();
    });

    it('kwota wpisana w którekolwiek pole wystarcza, także świadome 0', () => {
        expect(priceError(typeGross(EMPTY_PRICE_FIELDS, '615')!)).toBeUndefined();
        expect(priceError(typeNet(EMPTY_PRICE_FIELDS, '0')!)).toBeUndefined();
    });
});

describe('packagesToRename - pytanie o nazwy w pakietach tylko po zmianie nazwy', () => {
    const affected = [{ packageId: 'p1', packageName: 'Pakiet Nowy samochód' }];

    it('sama zmiana ceny: nie pytamy', () => {
        expect(packagesToRename('Mycie premium', { name: 'Mycie premium', affectedPackages: affected })).toEqual([]);
        expect(packagesToRename('Mycie premium ', { name: 'Mycie premium', affectedPackages: affected })).toEqual([]);
    });

    it('zmiana nazwy: pakiety z odpowiedzi serwera', () => {
        expect(packagesToRename('Mycie premium', { name: 'Mycie detailingowe', affectedPackages: affected })).toEqual(affected);
    });

    it('zmiana nazwy bez pakietów: nie pytamy', () => {
        expect(packagesToRename('A', { name: 'B', affectedPackages: undefined })).toEqual([]);
    });
});
