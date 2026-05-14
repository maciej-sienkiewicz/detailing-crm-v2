export function formatCents(cents: number | null | undefined): string {
    if (cents == null) return 'Cena do ustalenia';
    if (cents === 0) return 'Bezpłatnie';
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 2,
    }).format(cents / 100);
}

export function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(iso));
}

export function formatDateShort(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('pl-PL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('pl-PL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}

const FEATURE_LABELS: Record<string, string> = {
    CALENDAR: 'Kalendarz',
    VISITS: 'Wizyty',
    CUSTOMERS: 'Klienci',
    VEHICLES: 'Pojazdy',
    DOCUMENTS: 'Dokumenty',
    GALLERY: 'Galeria',
    FINANCE: 'Finanse',
    EMPLOYEES: 'Pracownicy',
    SMS_EMAIL: 'SMS i E-maile',
};

export function featureLabel(key: string): string {
    return FEATURE_LABELS[key] ?? key;
}
