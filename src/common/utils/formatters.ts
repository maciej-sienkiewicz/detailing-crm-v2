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

export const formatPhoneNumber = (phone: string): string => {
    const clean = phone.replace(/[\s-]/g, '').replace(/^\+48/, '');
    if (clean.length !== 9) return phone;
    return `+48 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
};