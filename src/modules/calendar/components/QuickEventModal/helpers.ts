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
