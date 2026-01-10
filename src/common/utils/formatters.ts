export const formatCurrency = (
    amount: number,
    currency = 'PLN',
    locale = 'pl-PL'
): string => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    }).format(amount);
};

export const formatDate = (
    date: string | Date,
    locale = 'pl-PL',
    options?: Intl.DateTimeFormatOptions
): string => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    };

    return new Intl.DateTimeFormat(locale, options ?? defaultOptions).format(
        typeof date === 'string' ? new Date(date) : date
    );
};

export const formatDateTime = (
    date: string | Date,
    locale = 'pl-PL'
): string => {
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(typeof date === 'string' ? new Date(date) : date);
};

export const formatNumber = (
    num: number,
    locale = 'pl-PL'
): string => {
    return new Intl.NumberFormat(locale).format(num);
};

export const formatPercentage = (
    value: number,
    locale = 'pl-PL'
): string => {
    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value / 100);
};

export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}...`;
};

export const capitalizeFirst = (text: string): string => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const formatPhoneNumber = (phone: string): string => {
    const clean = phone.replace(/[\s-]/g, '').replace(/^\+48/, '');
    if (clean.length !== 9) return phone;
    return `+48 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
};