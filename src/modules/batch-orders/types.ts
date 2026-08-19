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
    /**
     * Settled entries in the period, counted whether or not `entries` includes them.
     * Drives the "Pokaż rozliczone" toggle: without it a hidden settled entry is
     * indistinguishable from no settled entry at all.
     */
    settledCount: number;
    summary: EntrySummary;
}

/**
 * A position in this module's own service catalog.
 *
 * Separate from the retail `services` catalog on purpose: these are B2B settlement
 * positions with contract prices, and mixing them into the service picker used at
 * check-in would put two pricing regimes in one list. Entries snapshot their own
 * copy of name and amounts, so editing a position here never moves a number on an
 * entry that was already recorded.
 */
export interface BatchService {
    id: string;
    name: string;
    netAmountCents: number;
    grossAmountCents: number;
    vatRate: number;
    createdAt: string;
    updatedAt: string;
}

export interface BatchServiceRequest {
    name: string;
    netAmountCents: number;
    grossAmountCents: number;
    vatRate: number;
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

/**
 * Which entries a settlement covers. `NEW_ONLY` skips anything already settled.
 *
 * The wire names (and the endpoint, `close-month`) still say "close"; the concept
 * they encode is settling a period of any length, which is what the UI now calls it.
 */
export type SettlementMode = 'ALL' | 'NEW_ONLY';

export interface SettlementRequest {
    from: string;
    to: string;
    addToFinances: boolean;
    sendEmail: boolean;
    emailOverride?: string;
    mode: SettlementMode;
}

export interface SettlementResult {
    closedEntryCount: number;
    financeEntryCreated: boolean;
    emailSent: boolean;
    historyId: string;
}

export interface SettlementHistoryRecord {
    id: string;
    closedAt: string;
    periodFrom: string | null;
    periodTo: string | null;
    entryCount: number;
    totalNetCents: number;
    totalGrossCents: number;
    mode: SettlementMode;
    financeEntryCreated: boolean;
    emailRequested: boolean;
    emailSent: boolean;
    emailRecipient: string | null;
    closedByUserName: string | null;
}
