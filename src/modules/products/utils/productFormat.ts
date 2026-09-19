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

/**
 * Kiedy produkt był ostatnio w ruchu, w formie, która nie każe liczyć w pamięci.
 *
 * „14.05.2026" nic nie mówi bez kalendarza pod ręką, a w tabeli chodzi o jedno
 * pytanie: czy to produkt, którego używamy, czy leżak. Dlatego najpierw czas
 * względny, a dokładna data zostaje w podpowiedzi pod kursorem.
 */
export function formatLastUsed(iso: string, now: Date = new Date()): string {
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return '';

    const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
    if (days <= 0) return 'dziś';
    if (days === 1) return 'wczoraj';
    if (days < 7) return `${days} dni temu`;
    if (days < 31) {
        const weeks = Math.floor(days / 7);
        return weeks === 1 ? 'tydzień temu' : `${weeks} tyg. temu`;
    }
    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? 'miesiąc temu' : `${months} mies. temu`;
    const years = Math.floor(days / 365);
    return years === 1 ? 'rok temu' : `${years} lata temu`;
}

/** Pełna data do podpowiedzi pod kursorem: „14.05.2026". */
export function formatUsageDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pl-PL');
}
