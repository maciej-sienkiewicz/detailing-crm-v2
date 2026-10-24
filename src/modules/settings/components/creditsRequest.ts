// src/modules/settings/components/creditsRequest.ts
//
// Mail do obsługi z prośbą o kredyty SMS, dopóki zakup w aplikacji nie działa
// (patrz creditsContact.tsx).

import { supportMailto } from '@/modules/support/contact';
import type { SmsCreditPackage } from '../types';
import { creditsLabel, formatCreditCount, formatGrossCents, packageGrossCents } from './smsCreditPricing';

export type CreditsRequestPackage = Pick<SmsCreditPackage, 'name' | 'creditAmount' | 'priceGross' | 'currency'>;

/** Wiadomość do obsługi: który pakiet i za ile, żeby nie trzeba było dopytywać. */
export function creditsRequestHref(pkg: CreditsRequestPackage | null): string {
    if (!pkg) {
        return supportMailto('Kredyty SMS', 'Dzień dobry,\n\nchcę dokupić kredyty SMS.\n');
    }
    const credits = `${formatCreditCount(pkg.creditAmount)} ${creditsLabel(pkg.creditAmount)}`;
    const price = formatGrossCents(packageGrossCents(pkg), pkg.currency);
    return supportMailto(
        `Kredyty SMS: pakiet ${pkg.name}, ${credits}`,
        `Dzień dobry,\n\nchcę dokupić pakiet ${pkg.name}, ${credits} za ${price} brutto.\n`,
    );
}
