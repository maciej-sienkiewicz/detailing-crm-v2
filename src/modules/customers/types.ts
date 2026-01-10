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
    company: Omit<CompanyDetails, 'id'> | null;
    notes: string;
}