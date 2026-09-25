// src/modules/batch-orders/utils/entryForm.ts
//
// Formularz wpisu bez Reacta: stan pozycji, walidacja, sumy i payload. Wyjęte,
// żeby dało się je przetestować bez renderowania szuflady.

import { centsToInput, inputToCents } from '@/common/utils/moneyInput';
import { storedPriceSide, type PriceSide } from '@/common/utils/priceInputs';
import type { ServiceItemRequest } from '../types';
import { formatMoney } from './format';

export interface ServiceFormItem {
    name: string;
    netDisplay: string;
    grossDisplay: string;
    vatRate: number;
    /** Pole ceny wpisane ostatnio - przeżywa zmianę VAT bez przeliczenia (CLAUDE.md §1). */
    priceSide: PriceSide;
}

export const emptyService = (): ServiceFormItem =>
    ({ name: '', netDisplay: '', grossDisplay: '', vatRate: 23, priceSide: 'net' });

export const serviceToForm = (svc: { name: string; netAmountCents: number; grossAmountCents: number; vatRate: number }): ServiceFormItem => ({
    name: svc.name,
    netDisplay: centsToInput(svc.netAmountCents),
    grossDisplay: centsToInput(svc.grossAmountCents),
    vatRate: svc.vatRate,
    priceSide: storedPriceSide(svc.netAmountCents, svc.grossAmountCents, svc.vatRate),
});

const hasPrice = (s: ServiceFormItem) => inputToCents(s.netDisplay) > 0 || inputToCents(s.grossDisplay) > 0;

/**
 * Pierwszy problem, który blokuje zapis, albo null.
 *
 * Najważniejszy przypadek: pozycja z ceną, ale bez nazwy. Serwer odrzuca pozycje
 * bez nazwy, więc dawniej taka cena po prostu znikała przy zapisie - wpis wracał
 * tańszy, niż go wpisano, bez słowa wyjaśnienia.
 */
export function validateServices(services: ServiceFormItem[]): string | null {
    const unnamedWithPrice = services.find(s => !s.name.trim() && hasPrice(s));
    if (unnamedWithPrice) {
        return `Pozycja za ${formatMoney(inputToCents(unnamedWithPrice.grossDisplay))} nie ma nazwy usługi. Wpisz nazwę albo usuń pozycję.`;
    }
    if (!services.some(s => s.name.trim())) {
        return 'Dodaj co najmniej jedną usługę.';
    }
    return null;
}

/**
 * Pozycje do wysłania. Kwoty idą DOKŁADNIE tak, jak stoją w polach - obie strony,
 * bez przeliczania: brutto wpisane jako 1900,00 ma dojść do serwera jako 190000 gr.
 */
export function toServiceItems(services: ServiceFormItem[]): ServiceItemRequest[] {
    return services
        .filter(s => s.name.trim())
        .map(s => ({
            name: s.name.trim(),
            netAmountCents: inputToCents(s.netDisplay),
            grossAmountCents: inputToCents(s.grossDisplay),
            vatRate: s.vatRate,
        }));
}

export interface EntryTotals {
    netCents: number;
    grossCents: number;
    /** Różnica pokazanych kwot, nie osobne mnożenie - inaczej netto + VAT ≠ brutto. */
    vatCents: number;
}

/** Suma dokładnie tego, co pójdzie do zapisu - te same pozycje, te same kwoty. */
export function entryTotals(services: ServiceFormItem[]): EntryTotals {
    const items = toServiceItems(services);
    const netCents = items.reduce((sum, s) => sum + s.netAmountCents, 0);
    const grossCents = items.reduce((sum, s) => sum + s.grossAmountCents, 0);
    return { netCents, grossCents, vatCents: grossCents - netCents };
}

/** Jedna stawka VAT dla wszystkich pozycji, albo null przy mieszanych stawkach. */
export function commonVatRate(services: ServiceFormItem[]): number | null {
    const rates = new Set(services.filter(s => s.name.trim()).map(s => s.vatRate));
    return rates.size === 1 ? [...rates][0] : null;
}
