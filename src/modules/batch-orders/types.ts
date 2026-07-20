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
    services: ServiceItem[];
    netAmountCents: number;
    grossAmountCents: number;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
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
    services: ServiceItemRequest[];
    notes?: string;
}

export interface VehicleSuggestion {
    licensePlate: string;
    brand: string;
    model: string;
}
