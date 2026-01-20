export interface CompanyDetails {
    id: string;
    name: string;
    nip: string;
    regon: string;
    address: CompanyAddress;
}

export interface CompanyAddress {
    street: string;
    city: string;
    postalCode: string;
    country: string;
}

export interface HomeAddress {
    street: string;
    city: string;
    postalCode: string;
    country: string;
}

export interface CustomerContact {
    email: string;
    phone: string;
}

export interface CustomerRevenue {
    netAmount: number;
    grossAmount: number;
    currency: string;
}

export interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    contact: CustomerContact;
    homeAddress: HomeAddress | null;
    company: CompanyDetails | null;
    notes: string;
    lastVisitDate: string | null;
    totalVisits: number;
    vehicleCount: number;
    totalRevenue: CustomerRevenue;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerListResponse {
    data: Customer[];
    pagination: PaginationMeta;
}

export interface PaginationMeta {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export type CustomerSortField =
    | 'lastName'
    | 'lastVisitDate'
    | 'totalVisits'
    | 'totalRevenue'
    | 'vehicleCount'
    | 'createdAt';

export type SortDirection = 'asc' | 'desc';

export interface CustomerSortConfig {
    field: CustomerSortField;
    direction: SortDirection;
}

export interface CustomerFilters {
    search: string;
    page: number;
    limit: number;
    sortBy?: CustomerSortField;
    sortDirection?: SortDirection;
}

export interface CreateCustomerPayload {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    homeAddress: HomeAddress | null;
    companyData: Omit<CompanyDetails, 'id'> | null;
    notes: string;
}

// src/modules/customers/types.ts
// Add these interfaces to the existing types.ts file

export interface MarketingConsent {
    id: string;
    type: 'email' | 'sms' | 'phone' | 'postal';
    granted: boolean;
    grantedAt: string | null;
    revokedAt: string | null;
    lastModifiedBy: string;
}

export type EngineType = 'GASOLINE' | 'DIESEL' | 'HYBRID' | 'ELECTRIC';

export interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    vin: string;
    color: string;
    engineType: EngineType;
    mileage: number;
    nextInspectionDate: string | null;
    nextServiceDate: string | null;
    addedAt: string;
    status: 'active' | 'sold' | 'archived';
}

export interface Visit {
    id: string;
    date: string;
    type: 'service' | 'repair' | 'inspection' | 'consultation';
    vehicleId: string;
    vehicleName: string;
    description: string;
    totalCost: {
        netAmount: number;
        grossAmount: number;
        currency: string;
    };
    status: 'completed' | 'in-progress' | 'scheduled' | 'cancelled';
    technician: string;
    notes: string;
}

export interface CommunicationLog {
    id: string;
    date: string;
    type: 'email' | 'phone' | 'sms' | 'meeting';
    direction: 'inbound' | 'outbound';
    subject: string;
    summary: string;
    performedBy: string;
}

export interface CustomerDetailData {
    customer: Customer;
    marketingConsents: MarketingConsent[];
    loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
    lifetimeValue: {
        netAmount: number;
        grossAmount: number;
        currency: string;
    };
    lastContactDate: string | null;
}

export interface CustomerVehiclesResponse {
    vehicles: Vehicle[];
    totalCount: number;
}

export interface CustomerVisitsResponse {
    visits: Visit[];
    communications?: CommunicationLog[];
    pagination: PaginationMeta;
}

export interface UpdateConsentPayload {
    consentId: string;
    granted: boolean;
}

export interface AddVehiclePayload {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color: string;
    mileage: number;
}

// src/modules/customers/types.ts - Dodaj te interfejsy

export interface UpdateCustomerPayload {
    firstName?: string;
    lastName?: string;
    contact?: {
        email?: string;
        phone?: string;
    };
    homeAddress?: HomeAddress | null;
}

export interface UpdateCompanyPayload {
    name: string;
    nip: string;
    regon: string;
    address: CompanyAddress;
}

export interface UpdateNotesPayload {
    notes: string;
}

export type DocumentType = 'PHOTO' | 'PDF' | 'PROTOCOL' | 'INTAKE' | 'OUTTAKE' | 'DAMAGE_MAP' | 'OTHER';

export interface CustomerDocument {
    id: string;
    customerId: string;
    visitId?: string;
    type: DocumentType;
    name: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    uploadedBy: string;
    uploadedByName: string;
    category?: string;
}

export type DocumentCategory =
    | 'contracts'
    | 'invoices'
    | 'correspondence'
    | 'identity'
    | 'consents'
    | 'other';

export interface DocumentListResponse {
    data: CustomerDocument[];
    pagination: PaginationMeta;
}

export interface UploadDocumentPayload {
    file: File;
    customerId: string;
    visitId?: string;
    type: DocumentType;
    name?: string;
    category?: string;
}

export interface DocumentDownloadResponse {
    documentId: string;
    fileName: string;
    downloadUrl: string;
    expiresAt: string;
    fileSize: number;
    mimeType: string;
}

export interface ConsentUpdatePayload {
    granted: boolean;
    document: File;
    ipAddress: string;
    userAgent: string;
}

export interface DocumentFilters {
    category?: DocumentCategory;
    search?: string;
    page: number;
    limit: number;
    sortBy?: 'uploadedAt' | 'fileName' | 'fileSize';
    sortDirection?: SortDirection;
}
