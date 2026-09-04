export interface CompanySettings {
    id: string;
    name: string;
    taxId: string;
    regon: string;
    street: string;
    postalCode: string;
    city: string;
    phone: string;
    email: string;
    website: string | null;
    bankAccount: string | null;
    logoUrl: string | null;
    emailAlias: string | null;
    updatedAt: string;
}

export interface UpdateCompanySettingsRequest {
    name: string;
    taxId: string;
    regon: string;
    street: string;
    postalCode: string;
    city: string;
    phone: string;
    email: string;
    website?: string | null;
    bankAccount?: string | null;
}

export interface UploadLogoResponse {
    logoUrl: string;
}

// ─── Numeracja wizyt ──────────────────────────────────────────────────────────

export interface VisitNumberingConfig {
    /**
     * Szablon numeru, np. "VIS-{YYYY}-{SEQ}". Dostępne znaczniki: {YYYY} {YY} {MM} {DD}
     * i dokładnie jeden z {SEQ} (rosnący licznik) albo {RAND} (losowe cyfry, numer nie
     * zdradza liczby zrealizowanych wizyt).
     */
    format: string;
    /** Szerokość zerowego dopełnienia numeru porządkowego {SEQ}. */
    sequenceLength: number;
    /** Liczba losowych cyfr {RAND}. */
    randomLength: number;
    /** Przykładowy numer: dla {SEQ} zawsze z numerem 1, dla {RAND} świeżo wylosowany. */
    preview: string;
}

export interface UpdateVisitNumberingConfigRequest {
    format: string;
    sequenceLength: number;
    randomLength: number;
}

// ─── SMS Credits ──────────────────────────────────────────────────────────────

export type SmsCreditTransactionType = 'PURCHASE' | 'USAGE' | 'REFUND' | 'BONUS' | 'EXPIRY';

export interface SmsCreditBalance {
    availableCredits: number;
    totalPurchased: number;
    totalUsed: number;
    updatedAt: string;
}

export interface SmsCreditPackage {
    id: string;
    name: string;
    creditAmount: number;
    priceGross: number;
    currency: string;
    pricePerCredit: number;
}

export interface SmsCreditTransaction {
    id: string;
    type: SmsCreditTransactionType;
    amount: number;
    balanceAfter: number;
    description: string;
    referenceId: string | null;
    createdAt: string;
}

export interface SmsCreditTransactionPage {
    items: SmsCreditTransaction[];
    total: number;
    page: number;
    size: number;
}

export interface PurchaseCreditsResponse {
    availableCredits: number;
    message: string;
}

/**
 * Automatyczne tworzenie leadów — klasyfikacja przychodzącej poczty przez model.
 * `enabledAt` to moment włączenia: od niego liczy się próg „klasyfikujemy tylko
 * nowe wiadomości", więc jest null dokładnie wtedy, gdy funkcja jest wyłączona.
 */
export interface AutoLeadConfig {
    enabled: boolean;
    enabledAt: string | null;
}
