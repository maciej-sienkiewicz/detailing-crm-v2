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
    if (!iso) return '-';
    return new Intl.DateTimeFormat('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(iso));
}

export function formatDateShort(iso: string | null | undefined): string {
    if (!iso) return '-';
    return new Intl.DateTimeFormat('pl-PL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '-';
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
    AI_LEADS: 'Asystent AI dla leadów',
    INSTAGRAM_MONITORING: 'Monitoring Instagrama',
    SMS_EMAIL: 'Automatyzacja SMS i E-mail',
    CAMPAIGNS: 'Kampanie marketingowe',
    E_SIGNATURES: 'Podpisy elektroniczne',
    FINANCE: 'Finanse',
    STATISTICS: 'Statystyki',
};

export function featureLabel(key: string): string {
    return FEATURE_LABELS[key] ?? key;
}

/**
 * Dopisek przy cenie z cennika abonamentu. Ceny planów i modułów są w brutto
 * (`monthlyPriceGrossCents`) - to ta kwota idzie do Przelewy24 - więc cena bez słowa
 * „brutto" zostawiała właściciela z pytaniem, czy doliczyć VAT. Kwoty „Bezpłatnie"
 * i „Cena do ustalenia" dopisku nie dostają, bo nie ma czego doprecyzować.
 */
export function monthlyPriceSuffix(cents: number | null | undefined): string | null {
    if (cents == null || cents === 0) return null;
    return 'brutto / mies.';
}
