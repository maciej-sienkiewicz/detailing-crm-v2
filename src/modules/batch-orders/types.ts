export interface BatchContractor {
    id: string;
    name: string;
    taxId: string | null;
    address: string | null;
    contactPersonName: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    isActive: boolean;
    entryCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface ServiceItem {
    name: string;
    netAmountCents: number;
    grossAmountCents: number;
    vatRate: number;
}

export interface BatchOrderEntry {
    id: string;
    serviceDate: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleLicensePlate: string | null;
    vehicleVin: string | null;
    services: ServiceItem[];
    netAmountCents: number;
    grossAmountCents: number;
    notes: string | null;
    isClosed: boolean;
    createdAt: string;
    updatedAt: string;
}

export type CloseMode = 'ALL' | 'NEW_ONLY';

export interface CloseMonthRequest {
    from: string;
    to: string;
    mode: CloseMode;
    emailTo?: string;
}

export interface CloseMonthResult {
    historyId: string;
    entryCount: number;
    totalNetCents: number;
    totalGrossCents: number;
    emailSent: boolean;
}

export interface CloseHistoryRecord {
    id: string;
    contractorId: string;
    fromDate: string;
    toDate: string;
    mode: string;
    entryCount: number;
    totalNetCents: number;
    totalGrossCents: number;
    emailSent: boolean;
    emailTo: string | null;
    closedAt: string;
}

export interface EntrySummary {
    totalNetCents: number;
    totalGrossCents: number;
    entryCount: number;
}

export interface ContractorsResponse {
    contractors: BatchContractor[];
}

export interface ContractorEntriesResponse {
    contractor: BatchContractor;
    entries: BatchOrderEntry[];
    summary: EntrySummary;
}

export interface ContractorRequest {
    name: string;
    taxId?: string;
    address?: string;
    contactPersonName?: string;
    email?: string;
    phone?: string;
    notes?: string;
}

export interface ServiceItemRequest {
    name: string;
    netAmountCents: number;
    grossAmountCents: number;
    vatRate: number;
}

export interface EntryRequest {
    serviceDate: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleLicensePlate?: string;
    vehicleVin?: string;
    services: ServiceItemRequest[];
    notes?: string;
}

export interface VehicleSuggestion {
    licensePlate: string;
    brand: string;
    model: string;
    vin: string | null;
}

export interface BatchOrderPhoto {
    id: string;
    fileId: string;
    fileName: string;
    description: string | null;
    url: string;
    uploadedAt: string;
    uploadedByName: string | null;
}

export interface PhotoUploadRequest {
    fileName: string;
    description?: string;
}

export interface PhotoUploadResponse {
    photoId: string;
    uploadUrl: string;
    fileId: string;
}

