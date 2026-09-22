import { describe, it, expect } from 'vitest';
import { inputToCents } from './moneyInput';
import { grossToNet } from './priceAdjustment';
import {
    MONEY_INPUT_FORMAT,
    priceInputsForVatRate,
    storedPriceSide,
    type PriceInputFormat,
} from './priceInputs';

// ─── storedPriceSide ──────────────────────────────────────────────────────────

describe('storedPriceSide', () => {
    it('brutto nieosiągalne z netta: wpisał je człowiek', () => {
        // 154472 gr netto × 1,23 = 190001 gr, więc 190000 gr mogło przyjść tylko z ręki.
        expect(storedPriceSide(154472, 190000, 23)).toBe('gross');
    });

    it('para zgodna z przeliczeniem jest niejednoznaczna: zostaje netto', () => {
        expect(storedPriceSide(100000, 123000, 23)).toBe('net');
    });

    it('brak brutta: netto', () => {
        expect(storedPriceSide(100000, null, 23)).toBe('net');
        expect(storedPriceSide(100000, undefined, 23)).toBe('net');
    });

    it('ZW: brutto równe netto - netto, różne - brutto', () => {
        expect(storedPriceSide(100000, 100000, -1)).toBe('net');
        expect(storedPriceSide(100000, 100001, -1)).toBe('gross');
    });

    it('cena ręczna zapisana jako 0/0: netto', () => {
        expect(storedPriceSide(0, 0, 23)).toBe('net');
    });
});

// ─── priceInputsForVatRate ────────────────────────────────────────────────────

/*
 * Formularze zleceń zbiorczych (wpis i katalog usług) używają formatu domyślnego:
 * przecinek, puste pole = nic nie wpisano.
 */
describe('priceInputsForVatRate', () => {
    // 1900,00 zł wpisane jako brutto przy 23%: netto policzone z brutta.
    const typedGross = { net: '1544,72', gross: '1900,00' };

    it('wpisane brutto 1900,00 przeżywa 23% → 8% → 23% co do grosza', () => {
        const at8 = priceInputsForVatRate(typedGross, 23, 8, 'gross');
        expect(at8).toEqual({ net: '1759,26', gross: '1900,00' });
        expect(inputToCents(at8.net)).toBe(grossToNet(190000, 8));

        const back = priceInputsForVatRate(at8, 8, 23, 'gross');
        expect(back).toEqual({ net: '1544,72', gross: '1900,00' });
        expect(inputToCents(back.gross)).toBe(190000);
    });

    it('tak wyglądał błąd: brutto liczone z netta wraca jako 1900,01', () => {
        const at8 = priceInputsForVatRate(typedGross, 23, 8, 'net');
        const back = priceInputsForVatRate(at8, 8, 23, 'net');
        expect(back.gross).toBe('1900,01');
    });

    it('wpisane netto zostaje, brutto liczy się przy nowej stawce', () => {
        expect(priceInputsForVatRate({ net: '1000,00', gross: '1230,00' }, 23, 8, 'net'))
            .toEqual({ net: '1000,00', gross: '1080,00' });
        // Netto × stawka, nie żadna inna droga: 1544,72 × 1,23 = 1900,01.
        expect(priceInputsForVatRate({ net: '1544,72', gross: '1668,30' }, 8, 23, 'net').gross)
            .toBe('1900,01');
    });

    it('ta sama stawka: pola wracają nietknięte, nic się nie przelicza', () => {
        expect(priceInputsForVatRate(typedGross, 23, 23, 'gross')).toBe(typedGross);
        expect(priceInputsForVatRate(typedGross, 23, 23, 'net')).toBe(typedGross);
    });

    it('pole wpisane zostaje co do znaku, także niedokończone', () => {
        expect(priceInputsForVatRate({ net: '1544,72', gross: '1900' }, 23, 8, 'gross'))
            .toEqual({ net: '1759,26', gross: '1900' });
        expect(priceInputsForVatRate({ net: '100,5', gross: '123,62' }, 23, 8, 'net'))
            .toEqual({ net: '100,5', gross: '108,54' });
    });

    it('ZW: druga strona równa wpisanej, w obie strony', () => {
        expect(priceInputsForVatRate(typedGross, 23, -1, 'gross')).toEqual({ net: '1900,00', gross: '1900,00' });
        expect(priceInputsForVatRate(typedGross, 23, -1, 'net')).toEqual({ net: '1544,72', gross: '1544,72' });
        // Wyjście ze zwolnienia: wpisane brutto dalej zostaje.
        expect(priceInputsForVatRate({ net: '1900,00', gross: '1900,00' }, -1, 23, 'gross'))
            .toEqual({ net: '1544,72', gross: '1900,00' });
    });

    it('puste pole wpisane czyści drugie zamiast pokazywać 0,00', () => {
        expect(priceInputsForVatRate({ net: '', gross: '' }, 23, 8, 'net')).toEqual({ net: '', gross: '' });
        expect(priceInputsForVatRate({ net: '', gross: '' }, 23, 8, 'gross')).toEqual({ net: '', gross: '' });
    });

    it('stawka 5%: ta sama reguła dla każdej stawki', () => {
        const at5 = priceInputsForVatRate(typedGross, 23, 5, 'gross');
        expect(inputToCents(at5.net)).toBe(grossToNet(190000, 5));
        expect(at5.gross).toBe('1900,00');
        expect(priceInputsForVatRate({ net: '1000,00', gross: '1230,00' }, 23, 5, 'net').gross)
            .toBe('1050,00');
    });

    it('format formularza decyduje, co jest pustym polem i jak pisać kwotę', () => {
        // Format z kropką, w którym zero też znaczy „nic nie wpisano".
        const dotFormat: PriceInputFormat = {
            toCents: raw => {
                const cents = Math.round(parseFloat(raw) * 100);
                return cents > 0 ? cents : null;
            },
            toInput: cents => (cents / 100).toFixed(2),
        };
        expect(priceInputsForVatRate({ net: '1544.72', gross: '1900.00' }, 23, 8, 'gross', dotFormat))
            .toEqual({ net: '1759.26', gross: '1900.00' });
        expect(priceInputsForVatRate({ net: '0', gross: '' }, 23, 8, 'net', dotFormat))
            .toEqual({ net: '0', gross: '' });
    });
});

/*
 * Zlecenia zbiorcze (EntryFormModal, BatchServicesModal): pola w formacie domyślnym,
 * a do API idzie `{ netAmountCents, grossAmountCents }` = inputToCents obu pól.
 */
describe('zlecenia zbiorcze: zmiana stawki VAT w wierszu usługi', () => {
    const request = (fields: { net: string; gross: string }) => ({
        netAmountCents: inputToCents(fields.net),
        grossAmountCents: inputToCents(fields.gross),
    });

    it('pozycja z katalogu z brutto wpisanym od strony brutto: 23% → 8% → 23% zostawia 190000', () => {
        const stored = { netAmountCents: 154472, grossAmountCents: 190000, vatRate: 23 };
        const side = storedPriceSide(stored.netAmountCents, stored.grossAmountCents, stored.vatRate);
        expect(side).toBe('gross');

        const fields = { net: '1544,72', gross: '1900,00' };
        const back = priceInputsForVatRate(priceInputsForVatRate(fields, 23, 8, side), 8, 23, side);
        expect(request(back)).toEqual({ netAmountCents: 154472, grossAmountCents: 190000 });
    });

    it('wpisane netto (albo para nierozstrzygalna): netto zostaje, brutto liczy się od nowa', () => {
        expect(storedPriceSide(100000, 123000, 23)).toBe('net');
        expect(request(priceInputsForVatRate({ net: '1000,00', gross: '1230,00' }, 23, 8, 'net')))
            .toEqual({ netAmountCents: 100000, grossAmountCents: 108000 });
    });

    it('ta sama stawka: kwoty do API bez zmian', () => {
        const fields = { net: '1544,72', gross: '1900,00' };
        expect(request(priceInputsForVatRate(fields, 8, 8, 'net'))).toEqual({ netAmountCents: 154472, grossAmountCents: 190000 });
    });

    it('ZW: netto = brutto w żądaniu', () => {
        expect(request(priceInputsForVatRate({ net: '1544,72', gross: '1900,00' }, 23, -1, 'gross')))
            .toEqual({ netAmountCents: 190000, grossAmountCents: 190000 });
    });
});

describe('MONEY_INPUT_FORMAT', () => {
    it('puste pole (także same spacje) to brak kwoty, reszta to grosze', () => {
        expect(MONEY_INPUT_FORMAT.toCents('')).toBeNull();
        expect(MONEY_INPUT_FORMAT.toCents('  ')).toBeNull();
        expect(MONEY_INPUT_FORMAT.toCents('0')).toBe(0);
        expect(MONEY_INPUT_FORMAT.toCents('1900,00')).toBe(190000);
        expect(MONEY_INPUT_FORMAT.toInput(190000)).toBe('1900,00');
    });

    it('grosze przechodzą przez pole bez zmian: toCents(toInput(x)) = x', () => {
        [0, 1, 5, 99, 154472, 190000, 190001].forEach(cents => {
            expect(MONEY_INPUT_FORMAT.toCents(MONEY_INPUT_FORMAT.toInput(cents))).toBe(cents);
        });
    });
});
