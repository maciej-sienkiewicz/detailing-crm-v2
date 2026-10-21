import { describe, expect, it } from 'vitest';
import { netToGross } from '@/common/utils/priceAdjustment';
import {
    detectRate,
    invoiceGrossOf,
    invoiceItemsOf,
    invoiceLinesOf,
    invoiceRateOf,
    isPlnInput,
    itemAmounts,
    lineAmounts,
    linesFromPrices,
    linesPerRate,
    mergeLines,
    nipProblem,
    parsePln,
    priceAmounts,
    priceChanged,
    priceFromService,
    restoreDraft,
    servicesFingerprint,
    toInvoicePayload,
    toPln,
    toPriceChanges,
    totalsOf,
    unmergeLine,
    updatePrice,
    validateHandover,
    vatFromGross,
    vatFromNet,
    vatRateCodeOf,
    withDerived,
    type HandoverDraft,
    type HandoverItem,
    type HandoverState,
} from './handover';

/** Usługi wizyty z backendu: kwoty końcowe, stawka i strona ceny (basePriceGross = od brutto). */
const ceramika = priceFromService({ id: 'c', serviceName: 'Powłoka ceramiczna', vatRate: 23, basePriceGross: 800_000, finalPriceNet: 650_407, finalPriceGross: 800_000 });
const korekta = priceFromService({ id: 'k', serviceName: 'Korekta lakieru', vatRate: 23, basePriceGross: 300_000, finalPriceNet: 243_902, finalPriceGross: 300_000 });
const pranie = priceFromService({ id: 'p', serviceName: 'Pranie tapicerki', vatRate: 23, basePriceGross: 100_000, finalPriceNet: 81_301, finalPriceGross: 100_000 });
const ozon = priceFromService({ id: 'o', serviceName: 'Ozonowanie', vatRate: 8, basePriceGross: null, finalPriceNet: 10_000, finalPriceGross: 10_800 });

const state = (overrides: Partial<HandoverState> = {}): HandoverState => {
    const prices = overrides.prices ?? [ceramika, korekta, pranie];
    return {
        paymentMethod: 'CARD',
        documentType: 'INVOICE',
        buyer: { nip: '', name: 'Jan Kowalski', addressLine1: '', addressLine2: '', email: '' },
        prices,
        lines: linesFromPrices(prices),
        splitRemainder: false,
        exemptionBasis: '',
        protocolSigned: false,
        sendToKsef: null,
        thankYouSms: true,
        ...overrides,
    };
};

const draft = (d: HandoverDraft): string => JSON.stringify(d);

describe('servicesFingerprint', () => {
    const grossOf = (service: { id: string }) => ({ a: 0, b: 120_000 })[service.id as 'a' | 'b'] ?? 0;

    it('zmienia się po dopisaniu usługi do wizyty', () => {
        const before = servicesFingerprint([{ id: 'a', serviceName: 'Mycie' }], grossOf);
        const after = servicesFingerprint(
            [{ id: 'a', serviceName: 'Mycie' }, { id: 'b', serviceName: 'Powłoka' }],
            grossOf
        );
        expect(after).not.toBe(before);
    });

    it('zmienia się po zmianie ceny usługi', () => {
        const before = servicesFingerprint([{ id: 'a', serviceName: 'Mycie' }], () => 0);
        const after = servicesFingerprint([{ id: 'a', serviceName: 'Mycie' }], () => 120_000);
        expect(after).not.toBe(before);
    });

    it('zmienia się po zmianie stawki VAT, choć brutto zostało to samo', () => {
        // Cena wpisana w brutto przeżywa zmianę stawki bez zmiany kwoty - bez stawki
        // w odcisku draft wracałby z pozycją faktury na starej stawce.
        const before = servicesFingerprint([{ id: 'a', serviceName: 'Mycie', vatRate: 23 }], () => 190_000);
        const after = servicesFingerprint([{ id: 'a', serviceName: 'Mycie', vatRate: 8 }], () => 190_000);
        expect(after).not.toBe(before);
    });
});


describe('restoreDraft', () => {
    it('odtwarza draft w całości, gdy usługi się nie zmieniły', () => {
        const saved = state({ prices: [updatePrice(ceramika, { gross: '7000,00' }), korekta, pranie], splitRemainder: true });
        const restored = restoreDraft(state(), draft({ servicesFingerprint: 'x', state: saved }), 'x');
        expect(restored.splitRemainder).toBe(true);
        expect(priceAmounts(restored.prices[0]).gross).toBe(700_000);
    });

    it('po zmianie usług zostaje nabywca i wybory zapłaty, ceny i pozycje od nowa', () => {
        const saved = state({ paymentMethod: 'CASH', buyer: { ...state().buyer, name: 'Firma' }, splitRemainder: true });
        const restored = restoreDraft(state(), draft({ servicesFingerprint: 'stary', state: saved }), 'nowy');
        expect(restored.paymentMethod).toBe('CASH');
        expect(restored.buyer.name).toBe('Firma');
        expect(restored.splitRemainder).toBe(false);
    });

    it('draft sprzed cen przy wydaniu (bez prices) nie wraca jako stan ekranu', () => {
        const legacy = JSON.stringify({ servicesFingerprint: 'x', state: { paymentMethod: 'CASH', items: [] } });
        const restored = restoreDraft(state(), legacy, 'x');
        expect(restored.prices).toHaveLength(3);
        expect(restored.paymentMethod).toBe('CASH');
    });

    it('uszkodzony draft nie blokuje wydania', () => {
        expect(restoreDraft(state(), '{nie json', 'x')).toEqual(state());
    });
});

describe('ceny usług przy wydaniu', () => {
    it('cena z backendu zostaje co do grosza, a usługa od brutto startuje w trybie brutto', () => {
        expect(ceramika.mode).toBe('GROSS');
        expect(ozon.mode).toBe('NET');
        expect(priceAmounts(ceramika)).toEqual({ net: 650_407, gross: 800_000 });
        expect(priceChanged(ceramika)).toBe(false);
    });

    it('rabat 1000 zł na korekcie - kwota wizyty 11 000 zł i zmiana do wysłania od brutto', () => {
        const rabat = updatePrice(korekta, { gross: '2000,00' });
        expect(priceChanged(rabat)).toBe(true);
        expect(totalsOf([ceramika, rabat, pranie]).gross).toBe(1_100_000);
        expect(toPriceChanges([ceramika, rabat, pranie])).toEqual([
            { serviceItemId: 'k', netCents: 162_602, grossCents: 200_000, vatRate: 23 },
        ]);
    });

    it('zmiana stawki zostawia stronę ustaloną: od brutto kwota stoi, od netto rośnie', () => {
        const ceramika8 = updatePrice(ceramika, { vatRate: '8' });
        expect(priceAmounts(ceramika8).gross).toBe(800_000);
        const ozon23 = updatePrice(ozon, { vatRate: '23' });
        expect(priceAmounts(ozon23)).toEqual({ net: 10_000, gross: 12_300 });
        expect(toPriceChanges([ozon23])).toEqual([{ serviceItemId: 'o', netCents: 10_000, grossCents: null, vatRate: 23 }]);
    });

    it('zwolnienie idzie jako -1, jak stawka usługi w API', () => {
        expect(toPriceChanges([updatePrice(pranie, { vatRate: 'zw' })])[0].vatRate).toBe(-1);
    });

    it('bez zmian nic nie idzie na serwer', () => {
        expect(toPriceChanges([ceramika, korekta])).toEqual([]);
    });
});

describe('pozycje faktury', () => {
    it('jedna pozycja na usługę, w stronie ceny usługi', () => {
        const items = invoiceItemsOf(state({ prices: [ceramika, ozon] }));
        expect(items.map(i => [i.name, i.mode, itemAmounts(i).gross])).toEqual([
            ['Powłoka ceramiczna', 'GROSS', 800_000],
            ['Ozonowanie', 'NET', 10_800],
        ]);
    });

    it('scalenie usług tej samej stawki - suma brutto, usługi źródłowe zapamiętane', () => {
        const lines = mergeLines(linesFromPrices([ceramika, korekta, pranie]), [0, 1], [ceramika, korekta, pranie]);
        expect(Array.isArray(lines)).toBe(true);
        const merged = (lines as ReturnType<typeof linesFromPrices>)[0];
        expect(merged.serviceIds).toEqual(['c', 'k']);
        expect(itemAmounts(lineAmounts(merged, [ceramika, korekta, pranie])).gross).toBe(1_100_000);
    });

    it('scalenie 23% z 8% jest odrzucane - zmieniałoby podatek', () => {
        expect(mergeLines(linesFromPrices([ceramika, ozon]), [0, 1], [ceramika, ozon]))
            .toBe('Scalić można tylko usługi z tą samą stawką VAT.');
    });

    it('rozdzielenie wraca do pozycji usług', () => {
        const prices = [ceramika, korekta];
        const merged = mergeLines(linesFromPrices(prices), [0, 1], prices) as ReturnType<typeof linesFromPrices>;
        expect(unmergeLine(merged, 0, prices).map(l => l.serviceIds)).toEqual([['c'], ['k']]);
    });

    it('jedna pozycja na stawkę', () => {
        expect(linesPerRate([ceramika, ozon, korekta]).map(l => l.serviceIds)).toEqual([['c', 'k'], ['o']]);
    });

    it('usługi scalone, a potem z różnymi stawkami - pozycja do rozdzielenia', () => {
        const prices = [ceramika, updatePrice(korekta, { vatRate: '8' })];
        const s = state({ prices, lines: [{ name: 'Usługi', serviceIds: ['c', 'k'], onInvoice: true, partialGross: '' }] });
        expect(validateHandover({ state: s, sellerComplete: true }).map(p => p.message))
            .toContain('Pozycja 1 łączy usługi z różnymi stawkami VAT. Rozdziel ją.');
    });
});

describe('podział: faktura + inny dokument', () => {
    const rabat = updatePrice(korekta, { gross: '2000,00' });
    const prices = [ceramika, rabat, pranie];

    it('wizyta 12 000: rabat 1000, faktura 10 000 na ceramikę i korektę, 1000 bez paragonu', () => {
        const lines = linesFromPrices(prices).map(l => (l.serviceIds[0] === 'p' ? { ...l, onInvoice: false } : l));
        const s = state({ prices, lines, splitRemainder: true });
        const payload = toInvoicePayload(s, false);

        expect(payload.items.map(i => [i.sourceServiceItemIds, i.unitPriceGross])).toEqual([
            [['c'], 800_000],
            [['k'], 200_000],
        ]);
        expect(payload.remainderPaymentMethod).toBe('CASH');
        expect(payload.remainderWithoutReceipt).toBe(true);
        expect(validateHandover({ state: s, sellerComplete: true })).toEqual([]);
    });

    it('część kwoty usługi na fakturze, reszta na innym dokumencie', () => {
        const lines = linesFromPrices(prices).map(l => (l.serviceIds[0] === 'c' ? { ...l, partialGross: '7000,00' } : l));
        const s = state({ prices, lines, splitRemainder: true });
        expect(invoiceGrossOf(invoiceItemsOf(s))).toBe(700_000 + 200_000 + 100_000);
        expect(toInvoicePayload(s, false).remainderWithoutReceipt).toBe(true);
    });

    it('kwota na fakturze wyższa niż usługa - do poprawienia', () => {
        const lines = linesFromPrices(prices).map(l => (l.serviceIds[0] === 'p' ? { ...l, partialGross: '1500,00' } : l));
        const problems = validateHandover({ state: state({ prices, lines, splitRemainder: true }), sellerComplete: true });
        expect(problems.some(p => p.section === 'items')).toBe(true);
    });

    it('bez podziału faktura obejmuje całą kwotę i nie ma reszty', () => {
        const payload = toInvoicePayload(state({ prices }), false);
        expect(payload.remainderPaymentMethod).toBeUndefined();
        expect(invoiceGrossOf(invoiceLinesOf(state({ prices })).map(l => l.item))).toBe(1_100_000);
    });

    it('podział bez żadnej pozycji na fakturze - do poprawienia', () => {
        const lines = linesFromPrices(prices).map(l => ({ ...l, onInvoice: false }));
        const problems = validateHandover({ state: state({ prices, lines, splitRemainder: true }), sellerComplete: true });
        expect(problems.map(p => p.message)).toContain('Zaznacz co najmniej jedną pozycję na fakturze.');
    });
});

describe('validateHandover', () => {
    it('wizyta z usługami jak w wizycie nie ma przeszkód', () => {
        expect(validateHandover({ state: state(), sellerComplete: true })).toEqual([]);
    });

    it('brak danych sprzedawcy', () => {
        expect(validateHandover({ state: state(), sellerComplete: false }).map(p => p.section)).toContain('seller');
    });

    it('cena usługi musi być kwotą', () => {
        const s = state({ prices: [updatePrice(ceramika, { gross: '12,345' }), korekta] });
        // Trzecie miejsce po przecinku odrzuca pole wpisania (updatePrice dostaje tylko kwoty),
        // a puste pole trzeba uzupełnić.
        const empty = state({ prices: [updatePrice(ceramika, { gross: '' }), korekta] });
        expect(validateHandover({ state: empty, sellerComplete: true }).map(p => p.message))
            .toContain('Powłoka ceramiczna: podaj cenę.');
        expect(s.prices).toHaveLength(2);
    });

    it('stawka „zw" na fakturze wymaga podstawy zwolnienia', () => {
        const s = state({ prices: [updatePrice(pranie, { vatRate: 'zw' })] });
        expect(validateHandover({ state: s, sellerComplete: true }).map(p => p.message))
            .toContain('Stawka „zw" wymaga podania podstawy prawnej zwolnienia z VAT.');
    });

    it('paragon: tylko ceny', () => {
        expect(validateHandover({ state: state({ documentType: 'RECEIPT', buyer: { ...state().buyer, name: '' } }), sellerComplete: false })).toEqual([]);
    });

    it('faktura od księgowości: bez sprzedawcy i pozycji, nabywca nadal wymagany', () => {
        const s = state({ buyer: { ...state().buyer, name: '' } });
        expect(validateHandover({ state: s, sellerComplete: false, invoicedExternally: true }).map(p => p.section)).toEqual(['buyer']);
    });

    it('NIP z błędną sumą kontrolną blokuje wystawienie', () => {
        const s = state({ buyer: { ...state().buyer, nip: '1234567890' } });
        expect(validateHandover({ state: s, sellerComplete: true }).map(p => p.section)).toContain('buyer');
    });
});

describe('toInvoicePayload', () => {
    it('dane nabywcy: NIP bez kresek, puste pola pominięte, decyzja o KSeF wprost', () => {
        const payload = toInvoicePayload(state({ buyer: { nip: '526-104-08-28', name: ' Firma ', addressLine1: '', addressLine2: '', email: '' } }), true);
        expect(payload.buyerNip).toBe('5261040828');
        expect(payload.buyerName).toBe('Firma');
        expect(payload.buyerAddressLine1).toBeUndefined();
        expect(payload.sendToKsef).toBe(true);
    });

    it('pozycja zwolniona niesie podstawę zwolnienia', () => {
        const s = state({ prices: [updatePrice(pranie, { vatRate: 'zw' })], exemptionBasis: ' art. 43 ' });
        expect(toInvoicePayload(s, false).exemptionLegalBasis).toBe('art. 43');
        expect(toInvoicePayload(state(), false).exemptionLegalBasis).toBeUndefined();
    });
});

const item = (overrides: Partial<HandoverItem> = {}): HandoverItem => ({
    name: 'Powłoka ceramiczna',
    net: '',
    gross: '1900.00',
    mode: 'GROSS',
    vatRate: '23',
    ...overrides,
});

describe('toPln', () => {
    // Polski zapis z przecinkiem: kwota wyliczona przez ekran stoi w tym samym polu co
    // kwota wpisana ręcznie, więc „1544.72” obok „1900,00” wyglądało jak dwa formaty.
    it('grosze → złote z dwoma miejscami po przecinku', () => {
        expect(toPln(190_000)).toBe('1900,00');
        expect(toPln(154_472)).toBe('1544,72');
        expect(toPln(1)).toBe('0,01');
        expect(toPln(0)).toBe('0,00');
    });
});

describe('isPlnInput', () => {
    it('przepuszcza kwotę w trakcie wpisywania, z przecinkiem albo kropką', () => {
        for (const value of ['', '12', '12,', '12,4', '12,45', '12.45', ',5', '1 200,50', '1 200,50']) {
            expect(isPlnInput(value), value).toBe(true);
        }
    });

    it('odrzuca trzecie miejsce po przecinku i wszystko, co kwotą nie jest', () => {
        for (const value of ['12,345', '0,125', '1e5', '-5', '12.34.56', '1,200.50', 'abc']) {
            expect(isPlnInput(value), value).toBe(false);
        }
    });
});

describe('parsePln', () => {
    it('złote → grosze, z przecinkiem, kropką i spacją tysięcy', () => {
        expect(parsePln('1900,00')).toBe(190_000);
        expect(parsePln('1900.00')).toBe(190_000);
        expect(parsePln('1 900,00')).toBe(190_000);
        expect(parsePln('1 900,00')).toBe(190_000);
        // 19,99 × 100 w liczbach zmiennoprzecinkowych to 1998,999…
        expect(parsePln('19,99')).toBe(1_999);
    });

    it('niedokończona kwota czyta się tak, jak wygląda', () => {
        expect(parsePln('12,5')).toBe(1_250);
        expect(parsePln('12,')).toBe(1_200);
        expect(parsePln(',5')).toBe(50);
    });

    it('trzecie miejsce po przecinku nie jest zaokrąglane: „12,345" to nie 12,35', () => {
        expect(parsePln('12,345')).toBe(0);
        expect(parsePln('0,125')).toBe(0);
    });

    it('treść, która nie jest kwotą, daje zero', () => {
        expect(parsePln('')).toBe(0);
        expect(parsePln('abc')).toBe(0);
        expect(parsePln('1e5')).toBe(0);
        expect(parsePln('-5,00')).toBe(0);
        expect(parsePln('12.34.56')).toBe(0);
    });

    it('odczytuje dokładnie każdą kwotę zapisaną przez toPln', () => {
        for (let grosz = 0; grosz <= 20_000; grosz++) {
            expect(parsePln(toPln(grosz))).toBe(grosz);
        }
        expect(parsePln(toPln(190_000))).toBe(190_000);
        expect(parsePln(toPln(123_456_789))).toBe(123_456_789);
    });
});

describe('vatFromNet', () => {
    it('VAT od netto: round(netto × stawka%)', () => {
        expect(vatFromNet(154_472, '23')).toBe(35_529); // 35528,56
        expect(vatFromNet(10_000, '8')).toBe(800);
        expect(vatFromNet(10_000, '5')).toBe(500);
    });

    it('0% i zw nie doliczają VAT-u', () => {
        expect(vatFromNet(10_000, '0')).toBe(0);
        expect(vatFromNet(10_000, 'zw')).toBe(0);
    });
});

describe('vatFromGross', () => {
    it('VAT „w stu" od brutto: round(brutto × stawka / (100 + stawka))', () => {
        expect(vatFromGross(190_000, '23')).toBe(35_528); // 35528,46
        expect(vatFromGross(10_800, '8')).toBe(800);
        expect(vatFromGross(10_500, '5')).toBe(500);
    });

    it('0% i zw nie mają VAT-u w brutto', () => {
        expect(vatFromGross(10_000, '0')).toBe(0);
        expect(vatFromGross(10_000, 'zw')).toBe(0);
    });
});

describe('itemAmounts', () => {
    it('brutto wpisane (1900,00) zostaje dokładne, netto wynika z niego, VAT to różnica', () => {
        const { net, gross } = itemAmounts(item());

        expect(gross).toBe(190_000);
        expect(net).toBe(154_472);
        expect(gross - net).toBe(vatFromGross(190_000, '23'));
    });

    it('netto wpisane zostaje dokładne, brutto wynika z niego, VAT to różnica', () => {
        const { net, gross } = itemAmounts(item({ mode: 'NET', net: '1544.72', gross: '' }));

        expect(net).toBe(154_472);
        // Tak wygląda brutto policzone z netta - właśnie dlatego brutto uzgodnione
        // z klientem nie może iść na fakturę w trybie netto.
        expect(gross).toBe(190_001);
        expect(gross - net).toBe(vatFromNet(154_472, '23'));
    });

    it('pozycja zwolniona (zw) ma netto równe brutto', () => {
        expect(itemAmounts(item({ gross: '500.00', vatRate: 'zw' }))).toEqual({ net: 50_000, gross: 50_000 });
        expect(itemAmounts(item({ mode: 'NET', net: '500.00', vatRate: 'zw' }))).toEqual({ net: 50_000, gross: 50_000 });
    });

    it('kwota z trzecim miejscem po przecinku to zero, nie zaokrąglenie', () => {
        expect(itemAmounts(item({ gross: '12,345' }))).toEqual({ net: 0, gross: 0 });
    });
});

describe('withDerived', () => {
    it('w trybie brutto uzupełnia netto, a wpisanego brutto nie rusza', () => {
        const derived = withDerived(item({ gross: '1900,00', net: '' }));

        expect(derived.gross).toBe('1900,00');
        expect(derived.net).toBe('1544,72');
        expect(derived.mode).toBe('GROSS');
    });

    it('w trybie netto uzupełnia brutto, a wpisanego netto nie rusza', () => {
        const derived = withDerived(item({ mode: 'NET', net: '1544,72', gross: '' }));

        expect(derived.net).toBe('1544,72');
        expect(derived.gross).toBe('1900,01');
    });

    it('zmiana stawki przelicza tylko pole pochodne', () => {
        const derived = withDerived(item({ gross: '1900.00', net: '1544.72', vatRate: '8' }));

        expect(derived.gross).toBe('1900.00');
        expect(derived.net).toBe(toPln(190_000 - vatFromGross(190_000, '8')));
    });
});

describe('detectRate (zapasowo, dla usługi bez zapisanej stawki)', () => {
    it('rozpoznaje stawkę z proporcji brutto/netto', () => {
        expect(detectRate(10_000, 12_300)).toBe('23');
        expect(detectRate(10_000, 10_800)).toBe('8');
        expect(detectRate(10_000, 10_500)).toBe('5');
        expect(detectRate(10_000, 10_000)).toBe('0');
    });

    it('bez dopasowania i bez netta zakłada 23%', () => {
        expect(detectRate(10_000, 11_500)).toBe('23');
        expect(detectRate(0, 0)).toBe('23');
    });

    it('proporcja nie niesie stawki przy zw i groszowych kwotach - dlatego to tylko zapas', () => {
        // Usługa zwolniona: brutto = netto → „0%", choć powinno być „zw".
        expect(detectRate(50_000, 50_000)).toBe('0');
        // 1 gr netto przy 23% to 1 gr brutto → „0%"; 7 gr przy 8% to 8 gr → „23%".
        expect(detectRate(1, netToGross(1, 23))).toBe('0');
        expect(detectRate(7, netToGross(7, 8))).toBe('23');
    });
});

describe('vatRateCodeOf', () => {
    it('stawka usługi → kod stawki faktury; -1 to zwolnienie', () => {
        expect(vatRateCodeOf(23)).toBe('23');
        expect(vatRateCodeOf(8)).toBe('8');
        expect(vatRateCodeOf(5)).toBe('5');
        expect(vatRateCodeOf(0)).toBe('0');
        expect(vatRateCodeOf(-1)).toBe('zw');
    });

    it('brak stawki albo stawka spoza faktury daje null', () => {
        expect(vatRateCodeOf(null)).toBeNull();
        expect(vatRateCodeOf(undefined)).toBeNull();
        expect(vatRateCodeOf(7)).toBeNull();
    });
});

describe('invoiceRateOf', () => {
    it('usługa zwolniona idzie na fakturę jako „zw", nie „0"', () => {
        expect(invoiceRateOf(-1, 50_000, 50_000)).toBe('zw');
    });

    it('stawka usługi wygrywa z proporcją przy groszowych kwotach', () => {
        expect(invoiceRateOf(23, 1, netToGross(1, 23))).toBe('23');
        expect(invoiceRateOf(8, 7, netToGross(7, 8))).toBe('8');
        expect(invoiceRateOf(0, 50_000, 50_000)).toBe('0');
    });

    it('bez zapisanej stawki zgaduje z proporcji kwot', () => {
        expect(invoiceRateOf(null, 10_000, 10_800)).toBe('8');
        expect(invoiceRateOf(undefined, 10_000, 12_300)).toBe('23');
    });
});

describe('invoiceGrossOf', () => {
    it('sumuje brutto pozycji w obu trybach', () => {
        const items = [item(), item({ mode: 'NET', net: '100.00', gross: '' })];

        expect(invoiceGrossOf(items)).toBe(190_000 + 12_300);
    });

    it('pusta lista to zero', () => {
        expect(invoiceGrossOf([])).toBe(0);
    });
});

describe('nipProblem', () => {
    it('pusty NIP to konsument, nie błąd', () => {
        expect(nipProblem('')).toBeNull();
        expect(nipProblem('  ')).toBeNull();
    });

    it('sprawdza długość, a potem sumę kontrolną', () => {
        expect(nipProblem('123')).toBe('NIP nabywcy musi mieć 10 cyfr.');
        expect(nipProblem('3669982427')).toBe('NIP nabywcy ma błędną sumę kontrolną - sprawdź cyfry.');
        expect(nipProblem('521-301-72-28')).toBeNull();
    });
});

