// src/modules/settings/components/smsCreditPricing.ts
//
// Ceny pakietów kredytów SMS - jedyne miejsce, w którym sekcja kredytów liczy pieniądze.
//
// Źródłem prawdy jest BRUTTO z cennika: backend trzyma `priceGrossInCents`, tę kwotę
// obciąża bramka płatności i ją wysyła jako `priceGross` (BigDecimal w złotych, np. 246.00).
// Netto nie istnieje po stronie serwera, więc jest liczone stąd - `grossToNet` - a VAT to
// różnica pokazanych kwot (CLAUDE.md §1). Brutto nie jest nigdy odtwarzane z netta:
// „Do zapłaty" w oknie potwierdzenia musi być groszowo tą samą kwotą, którą pobierze P24.

import { grossToNet } from '@/common/utils/priceAdjustment';
import { pluralPl } from '@/common/utils/plural';
import type { SmsCreditPackage } from '../types';

/**
 * Kredyty są usługą elektroniczną opodatkowaną stawką podstawową. Backend nie zwraca
 * stawki przy pakiecie; gdy zacznie, ma ona zastąpić tę stałą.
 */
export const SMS_CREDITS_VAT_RATE = 23;

export interface PackagePrice {
    grossCents: number;
    netCents: number;
    vatCents: number;
    vatRate: number;
}

/**
 * `priceGross` przychodzi w złotych z dwoma miejscami po przecinku. Zamiana na grosze
 * to zmiana jednostki tej samej kwoty (Math.round zbiera tylko szum binarnego zapisu
 * 0,1 + 0,2), a nie przeliczenie VAT.
 */
export function packageGrossCents(pkg: Pick<SmsCreditPackage, 'priceGross'>): number {
    return Math.round(pkg.priceGross * 100);
}

export function packagePrice(pkg: Pick<SmsCreditPackage, 'priceGross'>, vatRate = SMS_CREDITS_VAT_RATE): PackagePrice {
    const grossCents = packageGrossCents(pkg);
    const netCents = grossToNet(grossCents, vatRate);
    return { grossCents, netCents, vatCents: grossCents - netCents, vatRate };
}

export function formatGrossCents(cents: number, currency = 'PLN'): string {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(cents / 100);
}

export function formatCreditCount(n: number): string {
    return n.toLocaleString('pl-PL');
}

/** 1 kredyt, 2 kredyty, 5 kredytów. */
export function creditsLabel(n: number): string {
    return pluralPl(n, 'kredyt', 'kredyty', 'kredytów');
}

/**
 * „12,30 gr za SMS" - cena jednego kredytu z brutto pakietu. To podział kwoty do
 * porównania pakietów, nie kwota, którą ktokolwiek zapłaci.
 */
export function pricePerSmsLabel(pkg: Pick<SmsCreditPackage, 'priceGross' | 'creditAmount'>): string {
    if (pkg.creditAmount <= 0) return '';
    const grosze = packageGrossCents(pkg) / pkg.creditAmount;
    const formatted = grosze.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formatted} gr za SMS`;
}
