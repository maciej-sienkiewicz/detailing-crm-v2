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
