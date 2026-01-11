// src/common/utils/validators.ts
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidPolishPostalCode = (postalCode: string): boolean => {
    return /^\d{2}-\d{3}$/.test(postalCode);
};

export const isValidPolishPhone = (phone: string): boolean => {
    const clean = phone.replace(/[\s-]/g, '');
    return /^(\+48)?\d{9}$/.test(clean);
};

export const validatePolishNip = (nip: string): boolean => {
    const clean = nip.replace(/[\s-]/g, '');
    if (!/^\d{10}$/.test(clean)) return false;

    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    const digits = clean.split('').map(Number);
    const checksum = digits.slice(0, 9).reduce((sum, digit, index) => sum + digit * weights[index], 0);
    const controlDigit = checksum % 11;

    return controlDigit === digits[9];
};

export const validatePolishRegon = (regon: string): boolean => {
    const clean = regon.replace(/[\s-]/g, '');
    if (!/^\d{9}(\d{5})?$/.test(clean)) return false;

    if (clean.length === 9) {
        const weights = [8, 9, 2, 3, 4, 5, 6, 7];
        const digits = clean.split('').map(Number);
        const checksum = digits.slice(0, 8).reduce((sum, digit, index) => sum + digit * weights[index], 0);
        const controlDigit = checksum % 11 === 10 ? 0 : checksum % 11;
        return controlDigit === digits[8];
    }
    if (clean.length === 14) {
        const weights = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
        const digits = clean.split('').map(Number);
        const checksum = digits.slice(0, 13).reduce((sum, digit, index) => sum + digit * weights[index], 0);
        const controlDigit = checksum % 11 === 10 ? 0 : checksum % 11;
        return controlDigit === digits[13];
    }

    return false;
};
export const isNotEmpty = (value: string | null | undefined): boolean => {
    return value !== null && value !== undefined && value.trim().length > 0;
};
export const isInRange = (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
};
export const hasMinLength = (value: string, minLength: number): boolean => {
    return value.length >= minLength;
};
export const hasMaxLength = (value: string, maxLength: number): boolean => {
    return value.length <= maxLength;
};
export const isNumeric = (value: string): boolean => {
    return /^\d+$/.test(value);
};
export const isAlphanumeric = (value: string): boolean => {
    return /^[a-zA-Z0-9]+$/.test(value);
};