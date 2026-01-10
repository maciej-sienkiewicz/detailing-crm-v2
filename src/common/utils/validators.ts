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

export const isNotEmpty = (value: string | null | undefined): boolean => {
    return value !== null && value !== undefined && value.trim().length > 0;
};

export const isInRange = (
    value: number,
    min: number,
    max: number
): boolean => {
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