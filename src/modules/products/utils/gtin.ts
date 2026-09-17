// src/modules/products/utils/gtin.ts
//
// Walidacja i normalizacja kodu kreskowego NA FRONCIE — brama przed płatnym zapytaniem.
// Kod z literówką dostaje komunikat natychmiast, a serwer nie płaci za rozpoznanie
// śmiecia. Serwer i tak waliduje powtórnie (ta sama reguła w domenie Gtin.kt) — front
// jest wygodą, nie zabezpieczeniem.

const DIGITS = /^[0-9]+$/;

/** Czysta suma kontrolna GS1 (mod-10) na 14 cyfrach z wiodącymi zerami. */
function checksumValid(gtin14: string): boolean {
    if (gtin14.length !== 14) return false;
    const body = gtin14.slice(0, -1);
    const check = Number(gtin14[gtin14.length - 1]);
    let sum = 0;
    // Waga liczona OD PRAWEJ strony ciała: pozycja najbliższa cyfrze kontrolnej ma wagę 3.
    for (let i = 0; i < body.length; i++) {
        const digit = Number(body[body.length - 1 - i]);
        sum += digit * (i % 2 === 0 ? 3 : 1);
    }
    const expected = (10 - (sum % 10)) % 10;
    return expected === check;
}

/** Zwraca znormalizowany GTIN-14 albo null. */
export function normalizeGtin(raw: string | null | undefined): string | null {
    const digits = (raw ?? '').trim().replace(/[\s-]/g, '');
    if (!DIGITS.test(digits)) return null;
    if (![8, 12, 13, 14].includes(digits.length)) return null;
    const padded = digits.padStart(14, '0');
    return checksumValid(padded) ? padded : null;
}

export function isValidGtin(raw: string | null | undefined): boolean {
    return normalizeGtin(raw) !== null;
}
