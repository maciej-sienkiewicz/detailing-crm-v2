/**
 * Kapitalizuje pierwszą literę i zamienia resztę na małe litery
 */
export const capitalize = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Parsuje wprowadzony tekst z pola wyszukiwania klienta
 */
export const parseCustomerInput = (input: string): {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
} => {
    const trimmed = input.trim();

    if (trimmed.includes('@')) {
        return { firstName: '', lastName: '', email: trimmed, phone: '' };
    }

    const digitsOnly = trimmed.replace(/[\s\-+()]/g, '');
    if (/^\d+$/.test(digitsOnly) && digitsOnly.length > 0) {
        return { firstName: '', lastName: '', email: '', phone: trimmed };
    }

    const words = trimmed.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 1) {
        return { firstName: capitalize(words[0]), lastName: '', email: '', phone: '' };
    } else if (words.length >= 2) {
        return { firstName: capitalize(words[0]), lastName: capitalize(words[1]), email: '', phone: '' };
    }

    return { firstName: '', lastName: '', email: '', phone: '' };
};

export const formatDateTimeLocal = (date: Date): string => {
    const d = new Date(date);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDate = (date: Date): string => {
    const d = new Date(date);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

import { applyAdjustment as _applyAdjustment } from '@/common/utils/priceAdjustment';

export const roundTo2 = (v: number): number =>
    Math.round((v + Number.EPSILON) * 100) / 100;

// Re-export from shared utility for convenient single-import by callers.
export { applyAdjustment, distributeAdjustment } from '@/common/utils/priceAdjustment';
export type { AdjustmentType, PriceAdjustment } from '@/common/utils/priceAdjustment';

// PLN-level wrapper around the cent-based shared applyAdjustment.
// Base gross is in PLN; adjustment.value is in cents for FIXED_*/SET_*, signed percent for PERCENT.
export const calculateFinalPrice = (
    baseGross: number,
    vatRate: number,
    adjustment: { type: string; value: number },
) => {
    const baseNet = roundTo2(baseGross / (1 + vatRate / 100));
    const baseNetCents = Math.round(baseNet * 100);

    const result = _applyAdjustment(baseNetCents, vatRate, adjustment as { type: any; value: number });

    return {
        finalNet: roundTo2(result.finalNetCents / 100),
        finalGross: roundTo2(result.finalGrossCents / 100),
        baseNet,
        baseGross,
        hasDiscount: result.hasDiscount,
    };
};
