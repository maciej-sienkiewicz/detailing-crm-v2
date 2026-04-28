export type LegalForm =
    | 'SOLE_PROPRIETORSHIP'
    | 'CIVIL_PARTNERSHIP'
    | 'GENERAL_PARTNERSHIP'
    | 'LIMITED_PARTNERSHIP'
    | 'LIMITED_LIABILITY_COMPANY'
    | 'JOINT_STOCK_COMPANY';

export interface CompanySettings {
    id: string;
    name: string;
    legalForm: LegalForm;
    taxId: string;
    regon: string;
    krs: string | null;
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
    legalForm: LegalForm;
    taxId: string;
    regon: string;
    krs?: string | null;
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
