// src/modules/subscription/utils/renewal.ts
//
// Co da przedłużenie zapłacone teraz. Datę liczy backend (`renewalPeriodEndsAt`) tą samą
// funkcją, która ustawia ją przy realizacji - front jej nie odtwarza. Dawniej ekrany po
// wygaśnięciu obiecywały „kolejne 30 dni", a odnowienie tuż po karencji obejmuje także dni
// karencji wykorzystane po końcu poprzedniego okresu: od zapłaty zostaje mniej niż 30 dni.

import type { MyPlanResponse } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RenewalCoverage {
    /** Koniec okresu kupionego przedłużeniem zapłaconym teraz. */
    endsAt: string;
    /** Od dziś zostaje wyraźnie mniej niż 30 dni - okres obejmuje wykorzystaną karencję. */
    includesUsedGrace: boolean;
}

export function renewalCoverage(
    plan: Pick<MyPlanResponse, 'renewalPeriodEndsAt' | 'billingStatus'>,
    now: number = Date.now(),
): RenewalCoverage | null {
    if (!plan.renewalPeriodEndsAt) return null;
    const remainingMs = new Date(plan.renewalPeriodEndsAt).getTime() - now;
    return {
        endsAt: plan.renewalPeriodEndsAt,
        // Doba zapasu: przedłużenie zapłacone w karencji też liczy się od końca okresu, ale
        // tam wyjaśnia to osobny komunikat; tu chodzi o studio już wygaszone.
        includesUsedGrace: plan.billingStatus === 'EXPIRED' && remainingMs < 29 * DAY_MS,
    };
}
