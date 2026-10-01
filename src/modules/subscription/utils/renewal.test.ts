import { describe, expect, it } from 'vitest';
import { renewalCoverage } from './renewal';
import type { MyPlanResponse } from '../types';

type Plan = Pick<MyPlanResponse, 'renewalPeriodEndsAt' | 'billingStatus'>;
const plan = (p: Plan) => p;

const NOW = new Date('2026-10-10T10:00:00Z').getTime();
const days = (n: number) => new Date(NOW + n * 24 * 60 * 60 * 1000).toISOString();

describe('renewalCoverage', () => {
    it('bez daty z backendu nie zgaduje', () => {
        expect(renewalCoverage(plan({ renewalPeriodEndsAt: null, billingStatus: 'EXPIRED' }), NOW)).toBeNull();
        expect(renewalCoverage(plan({ billingStatus: 'ACTIVE' }), NOW)).toBeNull();
    });

    it('wygasłe tuż po karencji - mniej niż 30 dni od dziś, bo okres obejmuje wykorzystaną karencję', () => {
        expect(renewalCoverage(plan({ renewalPeriodEndsAt: days(23), billingStatus: 'EXPIRED' }), NOW))
            .toEqual({ endsAt: days(23), includesUsedGrace: true });
    });

    it('wygasłe dawno - pełne 30 dni od zapłaty', () => {
        expect(renewalCoverage(plan({ renewalPeriodEndsAt: days(30), billingStatus: 'EXPIRED' }), NOW)?.includesUsedGrace).toBe(false);
    });

    it('przedłużenie w trakcie okresu nie jest „skrócone"', () => {
        expect(renewalCoverage(plan({ renewalPeriodEndsAt: days(40), billingStatus: 'ACTIVE' }), NOW)?.includesUsedGrace).toBe(false);
    });
});
