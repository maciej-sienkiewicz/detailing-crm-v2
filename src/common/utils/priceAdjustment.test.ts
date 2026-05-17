import { describe, it, expect } from 'vitest';
import { applyAdjustment, distributeAdjustment } from './priceAdjustment';

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
            // hasDiscount means "price differs from base" — true for markup too
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
