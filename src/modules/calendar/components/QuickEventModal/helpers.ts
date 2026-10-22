/**
 * Kapitalizuje pierwszą literę i zamienia resztę na małe litery
 */

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

export const roundTo2 = (v: number): number =>
    Math.round((v + Number.EPSILON) * 100) / 100;

// Re-export from shared utility for convenient single-import by callers.
export { applyAdjustment, distributeAdjustment } from '@/common/utils/priceAdjustment';
export type { AdjustmentType, PriceAdjustment } from '@/common/utils/priceAdjustment';
