// src/modules/comms/utils/draftOffer.ts
//
// Oferta w „Szkic AI": wiersze edytora usług → pozycje oferty dla asystenta.
//
// Wycena leada pamięta tylko cenę po rabacie. Oferta w mailu powinna umieć powiedzieć
// „regularnie 2 000,00 zł, dla Pana 1 800,00 zł" - dlatego do szkicu idzie też cena
// przed rabatem. Obie kwoty liczy ta sama funkcja co zapis wyceny (applyAdjustment
// z dokładnym brutto, CLAUDE.md §1): cena wpisana jako 1 900,00 zł zostaje 1 900,00 zł.
import { applyAdjustment } from '@/common/utils/priceAdjustment';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import type { DraftOfferLine } from '../types';

const NO_DISCOUNT = { type: 'PERCENT' as const, value: 0 };

/** Te same usługi w tej samej cenie zwijamy do ilości - oferta czyta się jak lista, nie jak dziennik. */
export function toDraftOffer(lines: ServiceLineItem[]): DraftOfferLine[] {
    const byKey = new Map<string, DraftOfferLine>();
    for (const line of lines) {
        const price = applyAdjustment(line.basePriceNet, line.vatRate, line.adjustment, line.basePriceGross).finalGrossCents;
        const regular = applyAdjustment(line.basePriceNet, line.vatRate, NO_DISCOUNT, line.basePriceGross).finalGrossCents;
        const note = line.note?.trim() || undefined;
        const regularPriceGross = regular > price ? regular : undefined;
        const key = JSON.stringify([line.serviceName, price, regularPriceGross ?? null, note ?? null]);
        const existing = byKey.get(key);
        if (existing) {
            existing.quantity += 1;
        } else {
            byKey.set(key, { name: line.serviceName, quantity: 1, priceGross: price, regularPriceGross, note });
        }
    }
    return [...byKey.values()];
}
