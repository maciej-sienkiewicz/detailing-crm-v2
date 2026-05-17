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

export const roundTo2 = (v: number): number =>
    Math.round((v + Number.EPSILON) * 100) / 100;

// Calculates final price from base gross price and a price adjustment.
// Base gross is in PLN. Adjustment.value is in cents for FIXED_* and SET_* types, or a signed percent for PERCENT.
export const calculateFinalPrice = (
    baseGross: number,
    vatRate: number,
    adjustment: { type: string; value: number },
) => {
    const baseNet = roundTo2(baseGross / (1 + vatRate / 100));
    const baseNetCents = Math.round(baseNet * 100);
    let finalNetCents = baseNetCents;

    switch (adjustment.type) {
        case 'PERCENT': {
            const pct = Math.round(baseNetCents * Math.abs(adjustment.value) / 100);
            finalNetCents = adjustment.value > 0 ? baseNetCents + pct : baseNetCents - pct;
            break;
        }
        case 'FIXED_NET':
            finalNetCents = baseNetCents - adjustment.value;
            break;
        case 'FIXED_GROSS': {
            const baseGrossCents = Math.round(baseGross * 100);
            finalNetCents = Math.round(((baseGrossCents - adjustment.value) * 100) / (100 + vatRate));
            break;
        }
        case 'SET_NET':
            finalNetCents = adjustment.value;
            break;
        case 'SET_GROSS':
            finalNetCents = Math.round((adjustment.value * 100) / (100 + vatRate));
            break;
    }

    if (finalNetCents < 0) finalNetCents = 0;

    const finalGrossCents = adjustment.type === 'SET_GROSS'
        ? adjustment.value
        : finalNetCents + Math.round((finalNetCents * vatRate) / 100);

    return {
        finalNet: roundTo2(finalNetCents / 100),
        finalGross: roundTo2(finalGrossCents / 100),
        baseNet,
        baseGross,
        hasDiscount: finalNetCents !== baseNetCents,
    };
};
