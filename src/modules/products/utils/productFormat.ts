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
