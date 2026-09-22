import { describe, it, expect } from 'vitest';
import {
    netToGross, grossToNet,
    netPlnToGrossPln, grossPlnToNetPln,
    applyAdjustment, distributeAdjustment, toApiServiceLineItem, resolveBaseNet, exactBaseGross,
    resolveBaseGross, isTypedGross, typedPriceSide, repriceForVatRate, withVatRate,
} from './priceAdjustment';

// ─── netToGross ───────────────────────────────────────────────────────────────

describe('netToGross', () => {
    it('standard VAT 23%', () => {
        expect(netToGross(10000, 23)).toBe(12300);
    });

    it('standard VAT 8%', () => {
        expect(netToGross(10000, 8)).toBe(10800);
    });

    it('VAT 0%: gross equals net', () => {
        expect(netToGross(10000, 0)).toBe(10000);
    });

    it('VAT ZW (-1): gross equals net', () => {
        expect(netToGross(100000, -1)).toBe(100000);
    });

    it('rounding: 1000 net at 23% → 1230 (no remainder)', () => {
        expect(netToGross(1000, 23)).toBe(1230);
    });

    it('rounding: 1 cent net at 23% → 1 (rounds down)', () => {
        expect(netToGross(1, 23)).toBe(1);
    });
});

// ─── grossToNet ───────────────────────────────────────────────────────────────

describe('grossToNet', () => {
    it('standard VAT 23%', () => {
        expect(grossToNet(12300, 23)).toBe(10000);
    });

    it('standard VAT 8%', () => {
        expect(grossToNet(10800, 8)).toBe(10000);
    });

    it('VAT 0%: net equals gross', () => {
        expect(grossToNet(10000, 0)).toBe(10000);
    });

    it('VAT ZW (-1): net equals gross', () => {
        expect(grossToNet(100000, -1)).toBe(100000);
    });

    it('grossToNet is inverse of netToGross for standard rates', () => {
        const net = 15000;
        expect(grossToNet(netToGross(net, 23), 23)).toBe(net);
        expect(grossToNet(netToGross(net, 8), 8)).toBe(net);
        expect(grossToNet(netToGross(net, 5), 5)).toBe(net);
    });
});

// ─── netPlnToGrossPln ─────────────────────────────────────────────────────────

describe('netPlnToGrossPln', () => {
    it('standard VAT 23%', () => {
        expect(netPlnToGrossPln(1000, 23)).toBe(1230);
    });

    it('VAT ZW (-1): gross equals net', () => {
        expect(netPlnToGrossPln(1260, -1)).toBe(1260);
    });

    it('VAT 0%: gross equals net', () => {
        expect(netPlnToGrossPln(500, 0)).toBe(500);
    });
});

// ─── grossPlnToNetPln ─────────────────────────────────────────────────────────

describe('grossPlnToNetPln', () => {
    it('standard VAT 23%', () => {
        expect(grossPlnToNetPln(1230, 23)).toBeCloseTo(1000, 5);
    });

    it('VAT ZW (-1): net equals gross', () => {
        expect(grossPlnToNetPln(1260, -1)).toBe(1260);
    });

    it('VAT 0%: net equals gross', () => {
        expect(grossPlnToNetPln(500, 0)).toBe(500);
    });
});

// ─── applyAdjustment ─────────────────────────────────────────────────────────

describe('applyAdjustment', () => {
    // Base: net = 10000 (100.00 PLN), VAT 23 % → gross = 12300 (123.00 PLN)
    const BASE_NET = 10000;
    const VAT = 23;

    describe('PERCENT', () => {
        it('applies 10 % discount (negative value)', () => {
            const result = applyAdjustment(BASE_NET, VAT, { type: 'PERCENT', value: -10 });
            // net: 10000 - round(10000 * 10/100) = 10000 - 1000 = 9000
            expect(result.finalNetCents).toBe(9000);
            // gross: 9000 + round(9000 * 23/100) = 9000 + 2070 = 11070
            expect(result.finalGrossCents).toBe(11070);
            expect(result.hasDiscount).toBe(true);
        });

        it('applies 10 % markup (positive value)', () => {
            const result = applyAdjustment(BASE_NET, VAT, { type: 'PERCENT', value: 10 });
            expect(result.finalNetCents).toBe(11000);
            expect(result.finalGrossCents).toBe(13530);
            // hasDiscount means "price differs from base": true for markup too
            expect(result.hasDiscount).toBe(true);
        });

        it('zero percent → no change', () => {
            const result = applyAdjustment(BASE_NET, VAT, { type: 'PERCENT', value: 0 });
            expect(result.finalNetCents).toBe(BASE_NET);
            expect(result.hasDiscount).toBe(false);
        });

        it('100 % discount → price becomes 0', () => {
            const result = applyAdjustment(BASE_NET, VAT, { type: 'PERCENT', value: -100 });
            expect(result.finalNetCents).toBe(0);
            expect(result.finalGrossCents).toBe(0);
        });

        it('clamps to 0 for discount beyond 100 %', () => {
            const result = applyAdjustment(BASE_NET, VAT, { type: 'PERCENT', value: -150 });
            expect(result.finalNetCents).toBe(0);
            expect(result.finalGrossCents).toBe(0);
        });
    });

    describe('FIXED_NET', () => {
        it('subtracts fixed net amount', () => {
            // discount: 2000 cents (20.00 PLN) from net
            const result = applyAdjustment(BASE_NET, VAT, { type: 'FIXED_NET', value: 2000 });
            expect(result.finalNetCents).toBe(8000);
            // gross: 8000 + round(8000*23/100) = 8000 + 1840 = 9840
            expect(result.finalGrossCents).toBe(9840);
            expect(result.hasDiscount).toBe(true);
        });

        it('zero discount → no change', () => {
            const result = applyAdjustment(BASE_NET, VAT, { type: 'FIXED_NET', value: 0 });
            expect(result.finalNetCents).toBe(BASE_NET);
            expect(result.hasDiscount).toBe(false);
        });

        it('clamps to 0 when discount exceeds base', () => {
            const result = applyAdjustment(BASE_NET, VAT, { type: 'FIXED_NET', value: 15000 });
            expect(result.finalNetCents).toBe(0);
        });
    });

    describe('FIXED_GROSS', () => {
        it('subtracts fixed gross amount and recalculates net', () => {
            // base gross = 12300, discount 1230 cents (10.00 % of gross)
            const result = applyAdjustment(BASE_NET, VAT, { type: 'FIXED_GROSS', value: 1230 });
            // new gross = 12300 - 1230 = 11070
            // new net = round(11070 * 100 / 123) = round(9000) = 9000
            expect(result.finalNetCents).toBe(9000);
            expect(result.finalGrossCents).toBe(11070);
            expect(result.hasDiscount).toBe(true);
        });

        it('zero discount → no change', () => {
            const result = applyAdjustment(BASE_NET, VAT, { type: 'FIXED_GROSS', value: 0 });
            expect(result.finalNetCents).toBe(BASE_NET);
        });
    });

    describe('SET_NET', () => {
        it('overrides net price completely', () => {
            const result = applyAdjustment(BASE_NET, VAT, { type: 'SET_NET', value: 5000 });
            expect(result.finalNetCents).toBe(5000);
            // gross: 5000 + round(5000 * 23/100) = 5000 + 1150 = 6150
            expect(result.finalGrossCents).toBe(6150);
            expect(result.hasDiscount).toBe(true);
        });

        it('setting same net → no change detected', () => {
            const result = applyAdjustment(BASE_NET, VAT, { type: 'SET_NET', value: BASE_NET });
            expect(result.hasDiscount).toBe(false);
        });

        it('clamps to 0 for negative set value', () => {
            const result = applyAdjustment(BASE_NET, VAT, { type: 'SET_NET', value: -100 });
            expect(result.finalNetCents).toBe(0);
        });
    });

    describe('SET_GROSS', () => {
        it('overrides gross price and back-calculates net', () => {
            // set gross = 9840 cents
            const result = applyAdjustment(BASE_NET, VAT, { type: 'SET_GROSS', value: 9840 });
            // net = round(9840 * 100 / 123) = round(8000) = 8000
            expect(result.finalNetCents).toBe(8000);
            expect(result.finalGrossCents).toBe(9840);
            expect(result.hasDiscount).toBe(true);
        });

        it('gross equal to base gross → no change', () => {
            // base gross = 12300
            const result = applyAdjustment(BASE_NET, VAT, { type: 'SET_GROSS', value: 12300 });
            expect(result.finalNetCents).toBe(BASE_NET);
            expect(result.hasDiscount).toBe(false);
        });
    });

    describe('VAT edge cases', () => {
        it('handles 0 % VAT', () => {
            const result = applyAdjustment(10000, 0, { type: 'PERCENT', value: -10 });
            expect(result.finalNetCents).toBe(9000);
            expect(result.finalGrossCents).toBe(9000);
        });

        it('handles 8 % VAT', () => {
            const result = applyAdjustment(10000, 8, { type: 'FIXED_NET', value: 2000 });
            expect(result.finalNetCents).toBe(8000);
            // gross: 8000 + round(8000 * 8/100) = 8000 + 640 = 8640
            expect(result.finalGrossCents).toBe(8640);
        });
    });
});

// ─── distributeAdjustment ────────────────────────────────────────────────────

describe('distributeAdjustment', () => {
    const svc = (net: number, vat = 23) => ({ basePriceNetCents: net, vatRate: vat });

    describe('PERCENT', () => {
        it('applies same percentage to every service', () => {
            const result = distributeAdjustment(
                [svc(10000), svc(5000), svc(8000)],
                'PERCENT',
                10,
            );
            expect(result).toHaveLength(3);
            result.forEach(adj => {
                expect(adj.type).toBe('PERCENT');
                expect(adj.value).toBe(-10); // stored as negative
            });
        });

        it('handles a single service', () => {
            const result = distributeAdjustment([svc(10000)], 'PERCENT', 15);
            expect(result[0]).toEqual({ type: 'PERCENT', value: -15 });
        });
    });

    describe('FIXED_NET', () => {
        it('distributes proportionally by net, no rounding drift', () => {
            // services: 10000 + 10000 = 20000 total net
            // discount: 4000 cents total
            const result = distributeAdjustment([svc(10000), svc(10000)], 'FIXED_NET', 4000);
            expect(result[0].value).toBe(2000);
            expect(result[1].value).toBe(2000);
            expect(result[0].value + result[1].value).toBe(4000);
        });

        it('gives rounding remainder to the last service', () => {
            // 3 services equal in base net; discount 100 cents → each should get 33/33/34
            const result = distributeAdjustment([svc(10000), svc(10000), svc(10000)], 'FIXED_NET', 100);
            const total = result.reduce((s, a) => s + a.value, 0);
            expect(total).toBe(100);
            expect(result[0].value + result[1].value + result[2].value).toBe(100);
        });

        it('distributes proportionally by relative net size', () => {
            // 2/3 vs 1/3 split
            const result = distributeAdjustment([svc(20000), svc(10000)], 'FIXED_NET', 3000);
            expect(result[0].value).toBe(2000); // 3000 * 20000/30000
            expect(result[1].value).toBe(1000); // remainder
        });

        it('returns zeros when total base is zero', () => {
            const result = distributeAdjustment([svc(0), svc(0)], 'FIXED_NET', 5000);
            result.forEach(adj => expect(adj.value).toBe(0));
        });
    });

    describe('FIXED_GROSS', () => {
        it('distributes proportionally by gross', () => {
            // VAT 23 %: gross for 10000 net = 12300; for 20000 net = 24600; total = 36900
            // discount = 3690 → share for svc1 = round(3690*12300/36900) = 1230
            //                   share for svc2 = 3690 - 1230 = 2460
            const result = distributeAdjustment([svc(10000), svc(20000)], 'FIXED_GROSS', 3690);
            expect(result[0].value).toBe(1230);
            expect(result[1].value).toBe(2460);
            expect(result[0].value + result[1].value).toBe(3690);
        });
    });

    describe('SET_NET', () => {
        it('distributes target net proportionally', () => {
            // services 10000 and 10000; target total net = 16000 → each gets 8000
            const result = distributeAdjustment([svc(10000), svc(10000)], 'SET_NET', 16000);
            expect(result[0]).toEqual({ type: 'SET_NET', value: 8000 });
            expect(result[1]).toEqual({ type: 'SET_NET', value: 8000 });
        });
    });

    describe('SET_GROSS', () => {
        it('distributes target gross proportionally by base gross', () => {
            // services: gross 12300 and 12300; target total gross 20000
            // each gets round(20000 * 12300/24600) = 10000
            const result = distributeAdjustment([svc(10000), svc(10000)], 'SET_GROSS', 20000);
            const total = result.reduce((s, a) => s + a.value, 0);
            expect(total).toBe(20000);
            expect(result[0].value).toBe(10000);
            expect(result[1].value).toBe(10000);
        });
    });

    describe('edge cases', () => {
        it('returns empty array for empty service list', () => {
            expect(distributeAdjustment([], 'PERCENT', 10)).toEqual([]);
            expect(distributeAdjustment([], 'FIXED_NET', 1000)).toEqual([]);
        });

        it('handles a single service (gets 100 % of the value)', () => {
            const result = distributeAdjustment([svc(10000)], 'FIXED_NET', 3000);
            expect(result[0].value).toBe(3000);
        });

        it('preserves correct adjustment type on all services', () => {
            const result = distributeAdjustment([svc(10000), svc(5000)], 'SET_GROSS', 9000);
            result.forEach(adj => expect(adj.type).toBe('SET_GROSS'));
        });
    });
});

// ─── toApiServiceLineItem ─────────────────────────────────────────────────────

describe('toApiServiceLineItem', () => {
    const base = { vatRate: 23 as const, serviceId: 'svc-1', serviceName: 'Test', id: 'line-1', note: '' };

    it('leaves non-manual services unchanged', () => {
        const svc = { ...base, basePriceNet: 10000, adjustment: { type: 'PERCENT' as const, value: -10 }, requireManualPrice: false };
        expect(toApiServiceLineItem(svc)).toEqual(svc);
    });

    it('collapses manual service with PERCENT discount to SET_NET=finalNet', () => {
        // basePriceNet=10000, 10% discount → finalNet = 9000
        const svc = { ...base, basePriceNet: 10000, adjustment: { type: 'PERCENT' as const, value: -10 }, requireManualPrice: true };
        const result = toApiServiceLineItem(svc);
        expect(result.basePriceNet).toBe(0);
        expect(result.adjustment.type).toBe('SET_NET');
        expect(result.adjustment.value).toBe(9000);
    });

    it('collapses manual service with no discount to SET_NET=basePriceNet', () => {
        const svc = { ...base, basePriceNet: 10000, adjustment: { type: 'PERCENT' as const, value: 0 }, requireManualPrice: true };
        const result = toApiServiceLineItem(svc);
        expect(result.basePriceNet).toBe(0);
        expect(result.adjustment.type).toBe('SET_NET');
        expect(result.adjustment.value).toBe(10000);
    });
});

// ─── resolveBaseNet ───────────────────────────────────────────────────────────

describe('resolveBaseNet', () => {
    // Normal catalog services: base is the raw basePriceNet, untouched.
    it('returns basePriceNet for a plain catalog service (no adjustment)', () => {
        expect(resolveBaseNet({ basePriceNet: 30000, vatRate: 23, adjustment: { type: 'PERCENT', value: 0 } })).toBe(30000);
    });

    it('returns basePriceNet for a catalog service that already has a PERCENT discount', () => {
        // The discount base must stay the ORIGINAL list price, not the discounted one.
        expect(resolveBaseNet({ basePriceNet: 50000, vatRate: 23, adjustment: { type: 'PERCENT', value: -10 } })).toBe(50000);
    });

    it('returns basePriceNet for a catalog service priced via SET_NET (base > 0)', () => {
        // basePriceNet is a real catalog price → do not override it.
        expect(resolveBaseNet({ basePriceNet: 40000, vatRate: 23, adjustment: { type: 'SET_NET', value: 35000 } })).toBe(40000);
    });

    // Manual-price services: persisted as basePriceNet=0 + SET_NET/SET_GROSS.
    it('resolves a manual-price service (basePriceNet=0 + SET_NET) to the set net', () => {
        expect(resolveBaseNet({ basePriceNet: 0, vatRate: 23, adjustment: { type: 'SET_NET', value: 50000 } })).toBe(50000);
    });

    it('resolves a manual-price service (basePriceNet=0 + SET_GROSS) to the net derived from gross', () => {
        // SET_GROSS 61500 @ 23% → net 50000
        expect(resolveBaseNet({ basePriceNet: 0, vatRate: 23, adjustment: { type: 'SET_GROSS', value: 61500 } })).toBe(50000);
    });

    it('does not fabricate a base for a genuinely zero-priced service (basePriceNet=0, non-SET adjustment)', () => {
        expect(resolveBaseNet({ basePriceNet: 0, vatRate: 23, adjustment: { type: 'PERCENT', value: 0 } })).toBe(0);
    });
});

// ─── Bulk discount over mixed services (regression for the "Rabatuj całość" bug) ─

describe('bulk discount base resolution (regression)', () => {
    // A visit with a normal catalog service and a manual-price service that the
    // server returned collapsed to basePriceNet=0 + SET_NET.
    const normal = { basePriceNet: 100000, vatRate: 23, adjustment: { type: 'PERCENT' as const, value: 0 } };
    const manual = { basePriceNet: 0, vatRate: 23, adjustment: { type: 'SET_NET' as const, value: 50000 } };
    const services = [normal, manual];

    it('"Łącznie przed rabatem" sums the resolved bases, not the raw basePriceNet', () => {
        // Old (buggy) behaviour summed basePriceNet → 100000 + 0 = 100000.
        const totalNet = services.reduce((sum, s) => sum + resolveBaseNet(s), 0);
        expect(totalNet).toBe(150000);
    });

    it('applying a 10% bulk discount does not wipe the manual-price service', () => {
        const bases = services.map(s => ({ basePriceNetCents: resolveBaseNet(s), vatRate: s.vatRate }));
        const adjustments = distributeAdjustment(bases, 'PERCENT', 10);

        // Re-apply each distributed adjustment on its resolved base (what the
        // component stores as the new basePriceNet + adjustment).
        const finals = bases.map((b, i) => applyAdjustment(b.basePriceNetCents, b.vatRate, adjustments[i]).finalNetCents);

        expect(finals[0]).toBe(90000);  // 100000 - 10%
        expect(finals[1]).toBe(45000);  // 50000 - 10% (previously collapsed to 0)
    });
});

// ─── exactBaseGross ───────────────────────────────────────────────────────────

/*
 * Zgłoszenie z produkcji: usługa założona z ceną 1900,00 zł BRUTTO pokazywała się
 * w tabeli „Usługi" jako 1900,01 zł.
 *
 * Powód jest arytmetyczny, nie przypadkowy: przy 23% VAT przejście brutto → netto
 * → brutto nie jest tożsamością. 190000 gr brutto daje 154472 gr netto (190000/1,23
 * = 154471,54), a 154472 gr netto daje z powrotem 190001 gr (154472 × 1,23 =
 * 190000,56). Kwota 1900,00 zł jest w tę stronę NIEOSIĄGALNA - nie ma takiego
 * netta w groszach. Jedyną obroną jest nie liczyć brutto po raz drugi.
 */
describe('exactBaseGross', () => {
    const noOp = { type: 'PERCENT', value: 0 } as const;

    it('brutto zapisane przy pozycji wygrywa z przeliczeniem', () => {
        expect(exactBaseGross({
            basePriceNet: 154472, vatRate: 23, adjustment: noOp, basePriceGross: 190000,
        })).toBe(190000);
    });

    it('przy rabacie zerowym brutto końcowe z serwera JEST brutto bazowym', () => {
        expect(exactBaseGross({
            basePriceNet: 154472, vatRate: 23, adjustment: noOp, finalPriceGross: 190000,
        })).toBe(190000);
    });

    it('upust kwotowy brutto da się cofnąć do bazy', () => {
        expect(exactBaseGross({
            basePriceNet: 100000,
            vatRate: 23,
            adjustment: { type: 'FIXED_GROSS', value: 2300 },
            finalPriceGross: 120700,
        })).toBe(123000);
    });

    it('rabatu liczonego od netta nie da się odwrócić - brak dokładnego brutto', () => {
        expect(exactBaseGross({
            basePriceNet: 100000,
            vatRate: 23,
            adjustment: { type: 'PERCENT', value: -10 },
            finalPriceGross: 110700,
        })).toBeUndefined();
    });

    it('bez jakiegokolwiek brutto zwraca undefined, a nie zgadniętą kwotę', () => {
        expect(exactBaseGross({
            basePriceNet: 154472, vatRate: 23, adjustment: noOp,
        })).toBeUndefined();
    });
});

describe('cena wpisana jako brutto nie pływa', () => {
    it('1900,00 zł brutto zostaje 1900,00 zł po zapisie i odczycie', () => {
        // Tak liczy katalog przy zakładaniu usługi: netto z brutta.
        const net = grossToNet(190000, 23);
        expect(net).toBe(154472);

        // Tak WYGLĄDAŁ błąd: odtworzenie brutta z netta.
        expect(netToGross(net, 23)).toBe(190001);

        // Tak jest teraz: brutto bazowe bierze się z tego, co ustalone.
        const line = { basePriceNet: net, vatRate: 23, adjustment: { type: 'PERCENT', value: 0 } as const, basePriceGross: 190000 };
        const baseGross = exactBaseGross(line) ?? netToGross(net, 23);
        const { finalNetCents, finalGrossCents } = applyAdjustment(net, 23, line.adjustment, baseGross);

        expect(finalGrossCents).toBe(190000);
        expect(finalNetCents).toBe(154472);
        // VAT to różnica pokazanych kwot - netto + VAT musi dać brutto co do grosza.
        expect(finalGrossCents - finalNetCents).toBe(35528);
    });

    it('cena wpisana jako netto nadal liczy brutto z netta', () => {
        // Nikt nie ustalił brutta, więc wolno je policzyć.
        const baseGross = exactBaseGross({ basePriceNet: 100000, vatRate: 23, adjustment: { type: 'PERCENT', value: 0 } })
            ?? netToGross(100000, 23);
        expect(baseGross).toBe(123000);
    });

    it('rabat procentowy liczy brutto od nowa, bo kwota bazowa przestała obowiązywać', () => {
        const { finalNetCents, finalGrossCents } = applyAdjustment(
            154472, 23, { type: 'PERCENT', value: -10 }, 190000,
        );
        expect(finalNetCents).toBe(139025);
        expect(finalGrossCents).toBe(netToGross(139025, 23));
    });
});

// ─── Dokładne brutto w pozostałych gałęziach (luki z inwentaryzacji) ──────────

describe('applyAdjustment z dokładnym brutto bazowym', () => {
    // 1900,00 zł brutto przy 23%: netto 154472 gr, a netto × 1,23 dałoby 190001 gr.
    const NET = 154472;
    const GROSS = 190000;

    it('upust brutto liczy się od WPISANEGO brutto, a nie od netto × stawka', () => {
        const r = applyAdjustment(NET, 23, { type: 'FIXED_GROSS', value: 10000 }, GROSS);
        expect(r.finalGrossCents).toBe(180000);
        expect(r.finalNetCents).toBe(grossToNet(180000, 23));
    });

    it('SET_GROSS zwraca wpisaną kwotę bez względu na bazę', () => {
        const r = applyAdjustment(NET, 23, { type: 'SET_GROSS', value: GROSS }, GROSS);
        expect(r.finalGrossCents).toBe(190000);
        expect(r.finalNetCents).toBe(154472);
    });

    it.each(['PERCENT', 'FIXED_NET', 'FIXED_GROSS'] as const)('rabat zerowy %s przepuszcza dokładne brutto', type => {
        const r = applyAdjustment(NET, 23, { type, value: 0 }, GROSS);
        expect(r.finalGrossCents).toBe(190000);
        expect(r.finalNetCents).toBe(NET);
    });

    it('rabat od netta liczy brutto od nowa - dokładne brutto przestaje obowiązywać', () => {
        const r = applyAdjustment(NET, 23, { type: 'FIXED_NET', value: 10000 }, GROSS);
        expect(r.finalNetCents).toBe(144472);
        expect(r.finalGrossCents).toBe(netToGross(144472, 23));
    });

    it('bez dokładnego brutto baza wynika z netta (dotychczasowe zachowanie)', () => {
        expect(applyAdjustment(NET, 23, { type: 'PERCENT', value: 0 }).finalGrossCents).toBe(190001);
    });
});

describe('exactBaseGross przy innych stawkach', () => {
    const noOp = { type: 'PERCENT', value: 0 } as const;

    it.each([
        [8, 100000],
        [5, 100000],
        [0, 100000],
        [-1, 100000],
    ])('stawka %i: brutto z serwera przy rabacie zerowym jest bazą', (vatRate, gross) => {
        expect(exactBaseGross({
            basePriceNet: grossToNet(gross, vatRate), vatRate, adjustment: noOp, finalPriceGross: gross,
        })).toBe(gross);
    });

    it.each([
        // [stawka, brutto wpisane, netto, brutto odtworzone z netta]
        [8, 1100, 1019, 1101],
        [8, 1600, 1481, 1599],
        [5, 1900, 1810, 1901],
    ])('stawka %i%%: %i gr brutto nie wraca jako kwota odtworzona z netta', (vatRate, gross, net, drifted) => {
        expect(grossToNet(gross, vatRate)).toBe(net);
        expect(netToGross(net, vatRate)).toBe(drifted);
        expect(exactBaseGross({ basePriceNet: net, vatRate, adjustment: noOp, basePriceGross: gross })).toBe(gross);
        expect(applyAdjustment(net, vatRate, noOp, gross).finalGrossCents).toBe(gross);
    });
});

describe('distributeAdjustment z dokładnym brutto', () => {
    it('upust brutto dzieli proporcjonalnie do DOKŁADNEGO brutto, suma się zgadza', () => {
        const bases = [
            { basePriceNetCents: 154472, basePriceGrossCents: 190000, vatRate: 23 },
            { basePriceNetCents: 81301, basePriceGrossCents: 100000, vatRate: 23 },
        ];
        const result = distributeAdjustment(bases, 'FIXED_GROSS', 29000);
        expect(result[0].value).toBe(19000);
        expect(result[1].value).toBe(10000);
        // Po rabacie brutto końcowe to równo 1710,00 i 900,00 zł.
        expect(applyAdjustment(154472, 23, result[0], 190000).finalGrossCents).toBe(171000);
        expect(applyAdjustment(81301, 23, result[1], 100000).finalGrossCents).toBe(90000);
    });

    it('SET_GROSS dzieli kwotę docelową bez gubienia grosza', () => {
        const bases = [
            { basePriceNetCents: 154472, basePriceGrossCents: 190000, vatRate: 23 },
            { basePriceNetCents: 154472, basePriceGrossCents: 190000, vatRate: 23 },
        ];
        const result = distributeAdjustment(bases, 'SET_GROSS', 300001);
        expect(result.reduce((s, a) => s + a.value, 0)).toBe(300001);
    });
});

describe('toApiServiceLineItem - cena ręczna wpisana jako brutto', () => {
    const base = { vatRate: 23, serviceId: 'svc-1', serviceName: 'Test', id: 'line-1', note: '' };

    it('brutto wpisane przez człowieka jedzie jako SET_GROSS z dokładną kwotą', () => {
        const svc = {
            ...base, basePriceNet: 154472, basePriceGross: 190000,
            adjustment: { type: 'PERCENT' as const, value: 0 }, requireManualPrice: true,
        };
        const result = toApiServiceLineItem(svc);
        expect(result.basePriceNet).toBe(0);
        expect(result.basePriceGross).toBeUndefined();
        expect(result.adjustment).toEqual({ type: 'SET_GROSS', value: 190000 });
    });

    it('upust brutto na cenie ręcznej schodzi z wpisanego brutto', () => {
        const svc = {
            ...base, basePriceNet: 154472, basePriceGross: 190000,
            adjustment: { type: 'FIXED_GROSS' as const, value: 10000 }, requireManualPrice: true,
        };
        expect(toApiServiceLineItem(svc).adjustment).toEqual({ type: 'SET_GROSS', value: 180000 });
    });

    it('brutto zgodne z netto × stawka nie jest dowodem wpisania - jedzie netto', () => {
        const svc = {
            ...base, basePriceNet: 100000, basePriceGross: 123000,
            adjustment: { type: 'PERCENT' as const, value: 0 }, requireManualPrice: true,
        };
        expect(toApiServiceLineItem(svc).adjustment).toEqual({ type: 'SET_NET', value: 100000 });
    });
});

// ─── resolveBaseGross ─────────────────────────────────────────────────────────

describe('resolveBaseGross', () => {
    it('cena ręczna SET_GROSS: bazą jest wpisane brutto', () => {
        expect(resolveBaseGross({ basePriceNet: 0, vatRate: 23, adjustment: { type: 'SET_GROSS', value: 190000 } })).toBe(190000);
    });

    it('cena ręczna SET_GROSS: nie bierze zapisanego brutto zera jako bazy', () => {
        expect(resolveBaseGross({
            basePriceNet: 0, vatRate: 23, adjustment: { type: 'SET_GROSS', value: 190000 }, basePriceGross: 0,
        })).toBe(190000);
    });

    it('cena ręczna SET_NET: brutto wolno policzyć (undefined)', () => {
        expect(resolveBaseGross({
            basePriceNet: 0, vatRate: 23, adjustment: { type: 'SET_NET', value: 100000 }, finalPriceGross: 123000,
        })).toBeUndefined();
    });

    it('zwykła pozycja: to samo co exactBaseGross', () => {
        const line = { basePriceNet: 154472, vatRate: 23, adjustment: { type: 'PERCENT' as const, value: -10 }, basePriceGross: 190000 };
        expect(resolveBaseGross(line)).toBe(190000);
        expect(resolveBaseGross({ ...line, basePriceGross: null })).toBeUndefined();
    });

    it('para z resolveBaseNet trzyma się ±1 gr - serwer ją przyjmie', () => {
        const line = { basePriceNet: 0, vatRate: 23, adjustment: { type: 'SET_GROSS' as const, value: 190000 } };
        const net = resolveBaseNet(line);
        const gross = resolveBaseGross(line)!;
        expect(Math.abs(netToGross(net, 23) - gross)).toBeLessThanOrEqual(1);
    });
});

// ─── isTypedGross ─────────────────────────────────────────────────────────────

describe('isTypedGross', () => {
    it('brutto nieosiągalne z netta = wpisane', () => {
        expect(isTypedGross(154472, 190000, 23)).toBe(true);
    });

    it('brutto zgodne z przeliczeniem jest niejednoznaczne, więc nie jest dowodem', () => {
        expect(isTypedGross(100000, 123000, 23)).toBe(false);
    });

    it('brak brutta = brak dowodu', () => {
        expect(isTypedGross(100000, null, 23)).toBe(false);
        expect(isTypedGross(100000, undefined, 23)).toBe(false);
    });

    it('ZW: brutto równe netto nie jest wpisaniem, różne - jest', () => {
        expect(isTypedGross(100000, 100000, -1)).toBe(false);
        expect(isTypedGross(100000, 100001, -1)).toBe(true);
    });
});

// ─── typedPriceSide ───────────────────────────────────────────────────────────

describe('typedPriceSide', () => {
    const line = (adjustment: { type: 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS'; value: number }, extra = {}) =>
        ({ basePriceNet: 154472, vatRate: 23, adjustment, ...extra });

    it('SET_GROSS i upust brutto: strona brutto', () => {
        expect(typedPriceSide(line({ type: 'SET_GROSS', value: 190000 }))).toBe('gross');
        expect(typedPriceSide(line({ type: 'FIXED_GROSS', value: 1000 }))).toBe('gross');
    });

    it('SET_NET i rabaty od netta: strona netto', () => {
        expect(typedPriceSide(line({ type: 'SET_NET', value: 100000 }))).toBe('net');
        expect(typedPriceSide(line({ type: 'PERCENT', value: -10 }, { basePriceGross: 190000 }))).toBe('net');
        expect(typedPriceSide(line({ type: 'FIXED_NET', value: 1000 }, { basePriceGross: 190000 }))).toBe('net');
    });

    it('rabat zerowy z brutto wpisanym od strony brutto: strona brutto', () => {
        expect(typedPriceSide(line({ type: 'PERCENT', value: 0 }, { basePriceGross: 190000 }))).toBe('gross');
        expect(typedPriceSide(line({ type: 'FIXED_GROSS', value: 0 }, { finalPriceGross: 190000 }))).toBe('gross');
    });

    it('rabat zerowy bez dokładnego brutto: strona netto', () => {
        expect(typedPriceSide(line({ type: 'PERCENT', value: 0 }))).toBe('net');
    });

    it('rabat zerowy z brutto zgodnym z przeliczeniem: nie da się rozstrzygnąć', () => {
        expect(typedPriceSide({
            basePriceNet: 100000, vatRate: 23, adjustment: { type: 'PERCENT', value: 0 }, basePriceGross: 123000,
        })).toBeNull();
    });
});

// ─── repriceForVatRate ────────────────────────────────────────────────────────

describe('repriceForVatRate', () => {
    const price = { netCents: 154472, grossCents: 190000 };

    it('ta sama stawka: para wraca nietknięta (brutto nie staje się 1900,01)', () => {
        expect(repriceForVatRate(price, 23, 23, 'net')).toBe(price);
        expect(repriceForVatRate(price, 23, 23, 'gross')).toBe(price);
    });

    it('wpisane brutto przechodzi przez zmianę stawki, netto liczy się od nowa', () => {
        expect(repriceForVatRate(price, 23, 8, 'gross')).toEqual({ netCents: grossToNet(190000, 8), grossCents: 190000 });
    });

    it('wpisane netto przechodzi przez zmianę stawki, brutto liczy się od nowa', () => {
        expect(repriceForVatRate({ netCents: 100000, grossCents: 123000 }, 23, 8, 'net'))
            .toEqual({ netCents: 100000, grossCents: 108000 });
    });

    it('23% → 8% → 23% z wpisanym brutto wraca do 1900,00 zł', () => {
        const at8 = repriceForVatRate(price, 23, 8, 'gross');
        const back = repriceForVatRate(at8, 8, 23, 'gross');
        expect(back.grossCents).toBe(190000);
    });

    it('ZW: netto = brutto w obie strony', () => {
        expect(repriceForVatRate(price, 23, -1, 'gross')).toEqual({ netCents: 190000, grossCents: 190000 });
        expect(repriceForVatRate(price, 23, -1, 'net')).toEqual({ netCents: 154472, grossCents: 154472 });
    });
});

// ─── withVatRate ──────────────────────────────────────────────────────────────

describe('withVatRate', () => {
    const typedGross = { id: 'a', basePriceNet: 154472, basePriceGross: 190000, vatRate: 23 };
    const catalog = { id: 'b', basePriceNet: 100000, basePriceGross: 123000, vatRate: 23 };

    it('ta sama stawka: pozycja nietknięta, dokładne brutto zostaje', () => {
        expect(withVatRate(typedGross, 23)).toBe(typedGross);
    });

    it('brutto wpisane od strony brutto zostaje, netto liczy się przy nowej stawce', () => {
        expect(withVatRate(typedGross, 8)).toEqual({ id: 'a', basePriceNet: grossToNet(190000, 8), basePriceGross: 190000, vatRate: 8 });
    });

    it('brutto zgodne z przeliczeniem: zostaje netto, stare brutto znika', () => {
        const r = withVatRate(catalog, 8);
        expect(r).toEqual({ id: 'b', basePriceNet: 100000, basePriceGross: undefined, vatRate: 8 });
        expect(netToGross(r.basePriceNet, r.vatRate)).toBe(108000);
    });

    it('pozycja bez brutto: zostaje netto', () => {
        expect(withVatRate({ basePriceNet: 5000, vatRate: 23 }, 5)).toEqual({ basePriceNet: 5000, vatRate: 5, basePriceGross: undefined });
    });
});
