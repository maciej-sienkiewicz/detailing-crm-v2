// src/common/utils/plural.ts

/**
 * Polska odmiana rzeczownika po liczbie: 1 pojazd, 2 pojazdy, 5 pojazdów.
 * Reguła jest ta sama dla wszystkich rzeczowników, więc formy podaje wywołujący.
 */
export const pluralPl = (count: number, one: string, few: string, many: string): string => {
    const abs = Math.abs(count);
    if (abs === 1) return one;
    const lastDigit = abs % 10;
    const lastTwo = abs % 100;
    const isFew = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14);
    return isFew ? few : many;
};
