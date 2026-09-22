import { describe, expect, it } from 'vitest';
import { grossToNet, netToGross } from '@/common/utils/priceAdjustment';
import {
    detectRate,
    invoiceGrossOf,
    invoiceItemFromService,
    invoiceRateOf,
    isPlnInput,
    itemAmounts,
    parsePln,
    restoreDraft,
    servicesFingerprint,
    toInvoicePayload,
    toPln,
    validateHandover,
    vatFromGross,
    vatFromNet,
    vatRateCodeOf,
    withDerived,
    type HandoverDraft,
    type HandoverItem,
    type HandoverState,
} from './handover';

const state = (overrides: Partial<HandoverState> = {}): HandoverState => ({
    paymentMethod: 'CARD',
    documentType: 'INVOICE',
    buyer: { nip: '', name: 'Jan Kowalski', addressLine1: '', addressLine2: '', email: '' },
    items: [{ name: 'Mycie', net: '', gross: '0.00', mode: 'GROSS', vatRate: '23' }],
    splitRemainder: false,
    remainderMethod: 'CASH',
    exemptionBasis: '',
    protocolSigned: false,
    sendToKsef: null,
    thankYouSms: true,
    ...overrides,
});

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
    it('bez draftu zwraca stan świeży', () => {
        const fresh = state();
        expect(restoreDraft(fresh, null, 'fp')).toBe(fresh);
    });

    it('odtwarza draft w całości, gdy usługi się nie zmieniły', () => {
        const saved = state({ splitRemainder: true, protocolSigned: true });
        const restored = restoreDraft(state(), draft({ servicesFingerprint: 'fp', state: saved }), 'fp');
        expect(restored.splitRemainder).toBe(true);
        expect(restored.protocolSigned).toBe(true);
    });

    it('po dopisaniu usługi porzuca pozycje z draftu i bierze te z aktualnej wizyty', () => {
        // Dokładnie zgłoszony błąd: draft zapisany przy jednej usłudze za 0 zł
        // wracał po dopisaniu usługi za 1200 zł i przykrywał aktualne pozycje.
        const stale = state({
            items: [{ name: 'Mycie', net: '', gross: '0.00', mode: 'GROSS', vatRate: '23' }],
            splitRemainder: true,
        });
        const fresh = state({
            items: [
                { name: 'Mycie', net: '', gross: '0.00', mode: 'GROSS', vatRate: '23' },
                { name: 'Powłoka', net: '', gross: '1200.00', mode: 'GROSS', vatRate: '23' },
            ],
        });

        const restored = restoreDraft(fresh, draft({ servicesFingerprint: 'stary', state: stale }), 'nowy');

        expect(restored.items).toEqual(fresh.items);
        expect(restored.splitRemainder).toBe(false);
    });

    it('po zmianie usług zachowuje dane nabywcy i wybory dotyczące zapłaty', () => {
        const stale = state({
            buyer: { nip: '5213017228', name: 'Firma', addressLine1: 'ul. Polerska 7', addressLine2: '00-001 Warszawa', email: '' },
            paymentMethod: 'TRANSFER',
            sendToKsef: false,
        });

        const restored = restoreDraft(state(), draft({ servicesFingerprint: 'stary', state: stale }), 'nowy');

        expect(restored.buyer.name).toBe('Firma');
        expect(restored.paymentMethod).toBe('TRANSFER');
        expect(restored.sendToKsef).toBe(false);
    });

    it('po zmianie usług pamięta odmowę wysłania podziękowania', () => {
        // „Nie wysyłaj" to decyzja o kliencie, nie o pozycjach faktury - dopisanie
        // usługi do wizyty nie ma prawa jej cofnąć i wysłać SMS-a wbrew niej.
        const stale = state({ thankYouSms: false });

        const restored = restoreDraft(state(), draft({ servicesFingerprint: 'stary', state: stale }), 'nowy');

        expect(restored.thankYouSms).toBe(false);
    });

    it('uszkodzony draft nie blokuje wydania', () => {
        const fresh = state();
        expect(restoreDraft(fresh, '{nie-json', 'fp')).toBe(fresh);
        expect(restoreDraft(fresh, JSON.stringify({ foo: 1 }), 'fp')).toBe(fresh);
    });
});

// ─── Kwoty ────────────────────────────────────────────────────────────────────
//
// Regresja, której pilnuje reszta pliku: usługa uzgodniona za 1900,00 zł brutto (23%)
// ma trafić na fakturę jako 1900,00 zł. Z netta nie da się tej kwoty odtworzyć - 154472 gr
// netto daje 1900,01 zł, 154471 gr daje 1899,99 zł (CLAUDE.md §1) - więc wpisane brutto
// jedzie na serwer wprost, a netto wynika z niego „w stu".

/** Pozycja wpisana od strony brutto: 1900,00 zł przy 23%. */
const item = (overrides: Partial<HandoverItem> = {}): HandoverItem => ({
    name: 'Powłoka ceramiczna',
    net: '',
    gross: '1900.00',
    mode: 'GROSS',
    vatRate: '23',
    ...overrides,
});

describe('toPln', () => {
    it('grosze → złote z dwoma miejscami po kropce', () => {
        expect(toPln(190_000)).toBe('1900.00');
        expect(toPln(154_472)).toBe('1544.72');
        expect(toPln(1)).toBe('0.01');
        expect(toPln(0)).toBe('0.00');
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
        expect(derived.net).toBe('1544.72');
        expect(derived.mode).toBe('GROSS');
    });

    it('w trybie netto uzupełnia brutto, a wpisanego netto nie rusza', () => {
        const derived = withDerived(item({ mode: 'NET', net: '1544,72', gross: '' }));

        expect(derived.net).toBe('1544,72');
        expect(derived.gross).toBe('1900.01');
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

describe('invoiceItemFromService', () => {
    it('usługa za 1900,00 brutto → pozycja 1900,00 w trybie brutto, netto wyliczone', () => {
        const seeded = invoiceItemFromService(
            { serviceName: 'Powłoka ceramiczna', vatRate: 23 },
            { finalPriceNet: 154_472, finalPriceGross: 190_000 }
        );

        expect(seeded).toEqual({
            name: 'Powłoka ceramiczna',
            net: '1544.72',
            gross: '1900.00',
            mode: 'GROSS',
            vatRate: '23',
        });
    });

    it('usługa zwolniona → pozycja „zw" z netto równym brutto', () => {
        const seeded = invoiceItemFromService(
            { serviceName: 'Szkolenie', vatRate: -1 },
            { finalPriceNet: 50_000, finalPriceGross: 50_000 }
        );

        expect(seeded.vatRate).toBe('zw');
        expect(itemAmounts(seeded)).toEqual({ net: 50_000, gross: 50_000 });
    });

    it('usługa bez zapisanej stawki dostaje stawkę z proporcji kwot', () => {
        const seeded = invoiceItemFromService(
            { serviceName: 'Mycie', vatRate: null },
            { finalPriceNet: 10_000, finalPriceGross: 10_800 }
        );

        expect(seeded.vatRate).toBe('8');
    });

    it('pozycja faktury ma dokładnie brutto i netto usługi, z której powstała', () => {
        // Brutto jest autorytatywne, a netto „w stu" - przy 5/8/23% wraca z tego netto
        // usługi zarówno dla ceny wpisanej w brutto, jak i dla brutto policzonego z netta.
        for (const rate of [23, 8, 5]) {
            for (let cents = 1; cents <= 5_000; cents++) {
                const fromNet = invoiceItemFromService(
                    { serviceName: 'x', vatRate: rate },
                    { finalPriceNet: cents, finalPriceGross: netToGross(cents, rate) }
                );
                expect(itemAmounts(fromNet)).toEqual({ net: cents, gross: netToGross(cents, rate) });

                const fromGross = invoiceItemFromService(
                    { serviceName: 'x', vatRate: rate },
                    { finalPriceNet: grossToNet(cents, rate), finalPriceGross: cents }
                );
                expect(itemAmounts(fromGross)).toEqual({ net: grossToNet(cents, rate), gross: cents });
            }
        }
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

describe('validateHandover', () => {
    const validate = (overrides: Partial<HandoverState>, visitGross = 190_000, sellerComplete = true) =>
        validateHandover({ state: state({ items: [item()], ...overrides }), visitGross, sellerComplete });

    it('faktura 1900,00 na wizytę za 1900,00 nie ma przeszkód', () => {
        expect(validate({})).toEqual([]);
    });

    it('pozycja z usługi za 1900,00 brutto zamyka wizytę co do grosza', () => {
        const seeded = invoiceItemFromService(
            { serviceName: 'Powłoka ceramiczna', vatRate: 23 },
            { finalPriceNet: 154_472, finalPriceGross: 190_000 }
        );

        expect(validate({ items: [seeded] })).toEqual([]);
    });

    it('dokument inny niż faktura nie jest walidowany', () => {
        expect(validate({ documentType: 'RECEIPT', items: [item({ name: '', gross: '' })] }, 190_000, false)).toEqual([]);
    });

    it('brak danych sprzedawcy', () => {
        expect(validate({}, 190_000, false).map(p => p.section)).toEqual(['seller']);
    });

    it('pozycja bez nazwy i kwoty', () => {
        const problems = validate({ items: [item({ name: '  ', gross: '0.00' })] }, 0);

        expect(problems).toEqual([{ section: 'items', message: 'Pozycja 1: podaj nazwę i kwotę.' }]);
    });

    it('kwota z trzecim miejscem po przecinku wymaga poprawienia, zamiast zaokrąglenia', () => {
        const problems = validate({ items: [item({ gross: '1900,005' })], splitRemainder: true });

        expect(problems).toEqual([{ section: 'items', message: 'Pozycja 1: podaj kwotę.' }]);
    });

    it('stawka „zw" wymaga podstawy zwolnienia', () => {
        const exempt = { items: [item({ vatRate: 'zw' })] };

        expect(validate(exempt).map(p => p.section)).toEqual(['items']);
        expect(validate({ ...exempt, exemptionBasis: 'art. 43 ust. 1 pkt 29' })).toEqual([]);
    });

    it('NIP nabywcy musi mieć 10 cyfr, a konsument - imię i nazwisko', () => {
        const buyer = state().buyer;

        expect(validate({ buyer: { ...buyer, nip: '123' } })).toEqual([
            { section: 'buyer', message: 'NIP nabywcy musi mieć 10 cyfr.' },
        ]);
        expect(validate({ buyer: { ...buyer, nip: '', name: ' ' } }).map(p => p.section)).toEqual(['buyer']);
        expect(validate({ buyer: { ...buyer, nip: '521-301-72-28', name: '' } })).toEqual([]);
    });

    it('faktura wyższa od wizyty - nawet o grosz', () => {
        const problems = validate({ items: [item({ gross: '1900.01' })] });

        expect(problems.map(p => p.section)).toEqual(['balance']);
        expect(problems[0].message).toContain('przekracza');
    });

    it('faktura niższa od wizyty wymaga wskazania, czym udokumentować resztę', () => {
        expect(validate({}, 250_000).map(p => p.section)).toEqual(['balance']);
        expect(validate({ splitRemainder: true }, 250_000)).toEqual([]);
    });
});

describe('toInvoicePayload', () => {
    it('brutto wpisane 1900,00 jedzie jako unitPriceGross 190000, a netto liczy serwer', () => {
        const typed = item({ gross: '1900,00' });
        const payload = toInvoicePayload(state({ items: [typed] }), 190_000, true);

        expect(payload.items).toEqual([
            { name: 'Powłoka ceramiczna', quantity: 1, unitPriceGross: 190_000, vatRate: '23' },
        ]);
        expect(payload.items[0]).not.toHaveProperty('unitPriceNet');
        // Netto pozycji to pochodna brutto - ta sama, którą policzy backend.
        expect(itemAmounts(typed).net).toBe(154_472);
    });

    it('netto wpisane jedzie jako unitPriceNet, dokładnie jak wpisano', () => {
        const payload = toInvoicePayload(
            state({ items: [item({ mode: 'NET', net: '1544,72', gross: '1900.01' })] }),
            190_001,
            true
        );

        expect(payload.items).toEqual([
            { name: 'Powłoka ceramiczna', quantity: 1, unitPriceNet: 154_472, vatRate: '23' },
        ]);
        expect(payload.items[0]).not.toHaveProperty('unitPriceGross');
    });

    it('pozycja zwolniona niesie kod „zw" i podstawę zwolnienia', () => {
        const payload = toInvoicePayload(
            state({ items: [item({ gross: '500.00', vatRate: 'zw' })], exemptionBasis: '  art. 43 ust. 1 pkt 29  ' }),
            50_000,
            true
        );

        expect(payload.items[0].vatRate).toBe('zw');
        expect(payload.exemptionLegalBasis).toBe('art. 43 ust. 1 pkt 29');
    });

    it('bez pozycji zwolnionej nie wysyła podstawy zwolnienia', () => {
        const payload = toInvoicePayload(state({ items: [item()], exemptionBasis: 'art. 43' }), 190_000, true);

        expect(payload.exemptionLegalBasis).toBeUndefined();
    });

    it('resztę kwoty wizyty dokumentuje wybrana metoda, tylko gdy reszta istnieje', () => {
        const partial = state({ items: [item()], splitRemainder: true, remainderMethod: 'CASH' });

        expect(toInvoicePayload(partial, 250_000, true).remainderPaymentMethod).toBe('CASH');
        expect(toInvoicePayload(partial, 190_000, true).remainderPaymentMethod).toBeUndefined();
    });

    it('dane nabywcy: NIP bez kresek, puste pola pominięte, decyzja o KSeF wprost', () => {
        const payload = toInvoicePayload(
            state({
                items: [item()],
                buyer: { nip: '521-301-72-28', name: '  Firma  ', addressLine1: ' ', addressLine2: '', email: '' },
            }),
            190_000,
            false
        );

        expect(payload).toMatchObject({ buyerNip: '5213017228', buyerName: 'Firma', sendToKsef: false });
        expect(payload.buyerAddressLine1).toBeUndefined();
        expect(payload.buyerAddressLine2).toBeUndefined();
        expect(payload.buyerEmail).toBeUndefined();
    });
});
