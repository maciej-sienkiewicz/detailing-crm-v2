// Builds the ServicesTable's line items from the form's flat state maps.
//
// Extracted out of the QuickEventModal component so the price arithmetic - the part a
// production bug actually lives in - can be unit-tested without mounting the whole modal.

import type { ServiceLineItem } from '@/common/components/ServicesTable';
import type { Service, ServiceAdjustment } from './types';

export interface ServicesAsLineItemsInput {
    selectedServiceIds: string[];
    serviceRefs: { [lineId: string]: string };
    services: Service[];
    tempServices: { [catalogId: string]: { name: string; basePriceNet: number; vatRate: number } };
    /** lineId → base gross price in ZŁOTYCH, exact as typed/stored (see PriceInput / QuickServiceModal). */
    servicePrices: { [lineId: string]: number };
    /** lineId → base net price in GROSZACH, exact as typed/stored - the counterpart to `servicePrices`. */
    serviceBasePrices: { [lineId: string]: number };
    serviceAdjustments: { [lineId: string]: ServiceAdjustment };
    serviceNotes: { [lineId: string]: string };
    serviceVatRates: { [lineId: string]: number };
}

/**
 * lineId → the catalog (or temp) service it refers to, then → the on-screen line item.
 *
 * Business rule: whichever field the user typed - netto or brutto - must never drift on
 * redisplay or resave. `servicePrices` (brutto) and `serviceBasePrices` (netto) are each
 * written ONCE, atomically as a pair, at the moment a price is established (adding a
 * catalog service, creating a one-off service, confirming a manual price, editing a line's
 * price) - see addService / handleQuickServiceCreate / handlePriceConfirm in
 * useQuickEventForm.ts and ServicesTable's own "Edytuj pozycję" editor. Both are read here
 * VERBATIM, never re-derived from one another: net→gross→net is not a round trip on the
 * grosz grid (1900,00 zł brutto → 1544,72 zł netto → re-derived 1900,01 zł at 23% VAT, and
 * the same gap exists starting from netto). Recomputing either from the other was the bug -
 * twice: once for the value saved to the backend, once for the value shown in this table.
 *
 * The VAT-formula fallback below only fires when `serviceBasePrices` genuinely has no entry
 * for a line (a draft saved before this fix, or `initialData` that never set it) - a safety
 * net for stale state, not the normal path.
 */
export function buildServicesAsLineItems(input: ServicesAsLineItemsInput): ServiceLineItem[] {
    return input.selectedServiceIds
        .map((id): ServiceLineItem | null => {
            const catalogId = input.serviceRefs[id] ?? id;
            let svc = input.services.find(s => s.id === catalogId);
            if (!svc && input.tempServices[catalogId]) {
                svc = { id: catalogId, ...input.tempServices[catalogId] } as Service;
            }
            if (!svc) return null;

            const baseGross = input.servicePrices[id] ?? 0;
            const vatRate = input.serviceVatRates[id] ?? svc.vatRate ?? 23;
            const exactNet = input.serviceBasePrices[id];
            const basePriceNet = exactNet ?? Math.round((baseGross / (1 + vatRate / 100)) * 100);

            return {
                id,
                serviceId: svc.id || catalogId,
                serviceName: svc.name,
                basePriceNet,
                basePriceGross: Math.round(baseGross * 100),
                vatRate,
                adjustment: (input.serviceAdjustments[id] ?? { type: 'PERCENT', value: 0 }) as ServiceAdjustment,
                note: input.serviceNotes[id] ?? '',
                isPackage: svc.isPackage ?? false,
                packageItems: svc.packageItems ?? null,
            } as ServiceLineItem;
        })
        .filter((item): item is ServiceLineItem => item !== null);
}
