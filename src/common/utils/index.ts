export {
    formatCurrency,
        formatDate,
        formatDateTime,
        formatNumber,
        formatPercentage,
        truncateText,
        capitalizeFirst,
        formatPhoneNumber,
} from './formatters';

export {
    MAX_2_DECIMALS,
    centsToInput,
    inputToCents,
    isZeroAmount,
    handleZeroAwareKeyDown,
} from './moneyInput';

export {
    isValidEmail,
    isValidPolishPostalCode,
    isValidPolishPhone,
    validatePolishNip,
    validatePolishRegon,
    isNotEmpty,
    isInRange,
    hasMinLength,
    hasMaxLength,
    isNumeric,
    isAlphanumeric,
} from './validators';

export { shouldAutoFocusInput } from './autoFocus';

export { pluralPl } from './plural';

/*
 * Przywrócone po scaleniu: ten eksport dołożył commit „Door to Door: sam odbior bez
 * dostawy…", a odtworzenie na nim gałęzi z mapą uszkodzeń przepisało ten plik w
 * całości i linia wypadła. `vite build` przewraca się wtedy na
 * „localDateTimeToInstant is not exported", bo `visitApi` importuje stąd, nie z
 * pliku źródłowego. Barrel jest miejscem, w którym takie zgubienie jest najłatwiejsze
 * i najmniej widoczne w diffie konfliktu.
 */
export { localDateTimeToInstant, instantToLocalDateTime } from './localDateTime';

export { smsSegments, smsWord, hasPolishCharacters } from './smsSegments';
