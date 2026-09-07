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
    serviceAdjustments: { [lineId: string]: ServiceAdjustment };
    serviceNotes: { [lineId: string]: string };
    serviceVatRates: { [lineId: string]: number };
}

/**
 * lineId → the catalog (or temp) service it refers to, then → the on-screen line item.
 *
 * `basePriceGross` is carried through exactly as stored in `servicePrices`, not re-derived
 * from `basePriceNet` - ServicesTable's own price engine (`applyAdjustment`) prefers it for
 * exactly this reason: net→gross rounding is not a round trip (1900,00 zł → 1544,72 zł
 * netto → re-derived 1900,01 zł at 23% VAT). Omitting it here was the bug: the table showed
 * the re-derived, off-by-a-grosz value even though the exact price was sitting right there
 * in `servicePrices`.
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
            const basePriceNet = Math.round((baseGross / (1 + vatRate / 100)) * 100);

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
