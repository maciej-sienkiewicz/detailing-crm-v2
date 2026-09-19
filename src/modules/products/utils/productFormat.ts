// src/modules/products/utils/productFormat.ts
import type { ProductPrice, UnitOfMeasure } from '../types';
import { UNIT_LABELS } from '../types';
import { formatMoneyAmount } from '@/modules/services/utils/priceCalculator';

/** „500 ml", „5 l", „1 szt." — wielkość opakowania w czytelnej formie. */
export function formatPackage(value: string, unit: UnitOfMeasure): string {
    const clean = value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    return `${clean} ${UNIT_LABELS[unit]}`;
}

/** Cena jednostkowa jako złotówki, np. „420,00 zł". Pokazujemy stronę ustaloną przez człowieka. */
export function formatPrice(price: ProductPrice): string {
    const cents = price.priceEnteredAs === 'GROSS' ? price.unitPriceGross : price.unitPriceNet;
    const suffix = price.priceEnteredAs === 'GROSS' ? 'brutto' : 'netto';
    return `${formatMoneyAmount(cents)} zł ${suffix}`;
}

/**
 * Ocena jako liczba do pokazania obok gwiazdki: „4", „4,5".
 *
 * Zespół stawia oceny całkowite, ale lista potrafi podać średnią - a „4.3333"
 * w kolumnie obok gwiazdki wygląda jak wyciek z bazy, nie jak ocena. Całkowite
 * zostają bez części dziesiętnej, reszta dostaje jedną cyfrę po przecinku
 * (polskim, nie kropce).
 */
export function formatRating(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded)
        ? String(rounded)
        : rounded.toFixed(1).replace('.', ',');
}
