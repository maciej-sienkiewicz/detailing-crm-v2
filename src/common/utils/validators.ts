// src/common/utils/validators.ts
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

