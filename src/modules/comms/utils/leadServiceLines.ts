// src/modules/comms/utils/leadServiceLines.ts
// Tłumaczenie między wyceną leada a edytorem usług używanym przy przyjęciu pojazdu.
//
// Wycena leada to ta sama czynność co wycena wizyty - te same usługi, ten sam cennik,
// ta sama potrzeba dopisania „bez zderzaka" przy pozycji. Dlatego lead korzysta
// z gotowego EditableServicesTable, a nie z własnej, uboższej listy.
//
// Jedna różnica modeli wymaga tłumaczenia: pozycja leada ma ILOŚĆ, a wiersz edytora
// nie ma - ma za to rabat liczony od konkretnej ceny. Rozwijamy więc ilość na wiersze
// (3 sztuki → trzy wiersze) i zwijamy z powrotem do ilości 1. Suma pozostaje ta sama
// co do grosza, a użytkownik dostaje w zamian rabat i notatkę na każdej pozycji
// z osobna - czego ilość nigdy nie potrafiła.
import { applyAdjustment, grossToNet } from '@/common/utils/priceAdjustment';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import type { LeadServiceItem, LeadServiceItemInput } from '../types';

/** Domyślna stawka dla pozycji sprzed V75, które znały wyłącznie brutto. */
const DEFAULT_VAT_RATE = 23;

/** Ile najwyżej wierszy rozwiniemy z jednej pozycji - zapora przed ilością z literówki. */
const MAX_EXPANDED_ROWS = 50;

export function toServiceLines(items: LeadServiceItem[]): ServiceLineItem[] {
    return items.flatMap((item) => {
        const vatRate = item.vatRate ?? DEFAULT_VAT_RATE;
        const basePriceNet = item.priceNet ?? grossToNet(item.priceGross, vatRate);
        const copies = Math.min(Math.max(1, item.quantity), MAX_EXPANDED_ROWS);
        return Array.from({ length: copies }, (_, index) => ({
            id: `${item.id}_${index}`,
            serviceId: item.serviceId,
            serviceName: item.name,
            basePriceNet,
            basePriceGross: item.priceGross,
            vatRate,
            // Cena jest już zamrożona w chwili wyceny - wracamy do niej bez rabatu,
            // żeby ponowne otwarcie edytora niczego nie przeliczyło samo z siebie.
            adjustment: { type: 'PERCENT' as const, value: 0 },
            note: item.note ?? '',
        }));
    });
}

export function toLeadInputs(lines: ServiceLineItem[]): LeadServiceItemInput[] {
    return lines.map((line) => {
        const { finalNetCents, finalGrossCents } = applyAdjustment(
            line.basePriceNet,
            line.vatRate,
            line.adjustment,
            line.basePriceGross
        );
        return {
            serviceId: line.serviceId,
            // Nazwę wysyłamy zawsze: pozycja z katalogu mogła zostać w nim przemianowana,
            // a wycena ma pokazywać to, co widział człowiek w chwili jej robienia.
            name: line.serviceName,
            priceGross: finalGrossCents,
            priceNet: finalNetCents,
            vatRate: line.vatRate,
            note: line.note?.trim() || undefined,
            quantity: 1,
        };
    });
}

/** Pozycja wyceny rozpisana na netto / VAT / brutto - kształt tabeli podglądu. */
export interface LeadQuoteRow {
    id: string;
    name: string;
    note: string | null;
    quantity: number;
    netCents: number;
    vatCents: number;
    grossCents: number;
}

/**
 * Wycena leada w rozbiciu na kwoty. Brutto jest źródłem prawdy (to ono trafia do
 * sumy leada), netto bierzemy z zapisanego pola, a gdy go nie ma - z przeliczenia
 * po stawce. VAT liczymy jako różnicę, nie osobnym mnożeniem: inaczej suma trzech
 * kolumn potrafi rozminąć się o grosz z kwotą, którą klient widzi na ofercie.
 */
export function toQuoteRows(items: LeadServiceItem[]): LeadQuoteRow[] {
    return items.map((item) => {
        const vatRate = item.vatRate ?? DEFAULT_VAT_RATE;
        const unitNet = item.priceNet ?? grossToNet(item.priceGross, vatRate);
        const quantity = Math.max(1, item.quantity);
        const grossCents = item.totalGross;
        const netCents = unitNet * quantity;
        return {
            id: item.id,
            name: item.name,
            note: item.note,
            quantity,
            netCents,
            vatCents: grossCents - netCents,
            grossCents,
        };
    });
}

/** Suma brutto po rabatach - ta sama liczba, którą zapisze backend. */
export function totalGrossOf(lines: ServiceLineItem[]): number {
    return lines.reduce((sum, line) => {
        const { finalGrossCents } = applyAdjustment(
            line.basePriceNet,
            line.vatRate,
            line.adjustment,
            line.basePriceGross
        );
        return sum + finalGrossCents;
    }, 0);
}
