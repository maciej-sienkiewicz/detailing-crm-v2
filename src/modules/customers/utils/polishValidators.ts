const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7];
const REGON_9_WEIGHTS = [8, 9, 2, 3, 4, 5, 6, 7];
const REGON_14_WEIGHTS = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];

export const validatePolishNip = (nip: string): boolean => {
    const cleanNip = nip.replace(/[\s-]/g, '');

    if (!/^\d{10}$/.test(cleanNip)) {
        return false;
    }

    const digits = cleanNip.split('').map(Number);
    const checksum = NIP_WEIGHTS.reduce(
        (sum, weight, index) => sum + weight * digits[index],
        0
    );

    return checksum % 11 === digits[9];
};

export const validatePolishRegon = (regon: string): boolean => {
    const cleanRegon = regon.replace(/[\s-]/g, '');

    if (!/^(\d{9}|\d{14})$/.test(cleanRegon)) {
        return false;
    }

    const digits = cleanRegon.split('').map(Number);
    const weights = cleanRegon.length === 9 ? REGON_9_WEIGHTS : REGON_14_WEIGHTS;

    const checksum = weights.reduce(
        (sum, weight, index) => sum + weight * digits[index],
        0
    );

    const expectedCheckDigit = checksum % 11 === 10 ? 0 : checksum % 11;
    return expectedCheckDigit === digits[digits.length - 1];
};

export const formatNip = (nip: string): string => {
    const clean = nip.replace(/[\s-]/g, '');
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 8)}-${clean.slice(8)}`;
};

export const formatRegon = (regon: string): string => {
    const clean = regon.replace(/[\s-]/g, '');
    if (clean.length === 9) {
        return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
    return clean;
};