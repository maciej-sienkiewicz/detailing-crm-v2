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
