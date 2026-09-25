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
    /**
     * Wpis rozliczony, a potem świadomie odblokowany do korekty. Wraca do najbliższego
     * rozliczenia i do tego czasu nosi oznaczenie, żeby nikt nie wziął go za zwykły nowy wpis.
     */
    isCorrection: boolean;
    /** Rozliczenie, w którym wpis został ujęty; null dla wpisu otwartego. */
    closeHistoryId: string | null;
    photoCount: number;
    createdAt: string;
    updatedAt: string;
}

/**
 * Co pokazuje lista wpisów. Ten sam filtr idzie do zestawienia PDF, żeby kwota
 * w pliku była tą samą kwotą, którą widać na ekranie.
 */
export type EntryStatusFilter = 'OPEN' | 'SETTLED' | 'ALL';

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
    /** Sumy wpisów zwróconych w `entries` - zależą od filtra statusu. */
    summary: EntrySummary;
    /** Co w okresie czeka na rozliczenie - niezależnie od filtra. Kwota nagłówka. */
    openSummary: EntrySummary;
    /** Co w okresie już rozliczono - niezależnie od filtra. */
    settledSummary: EntrySummary;
    /** Kiedy ostatnio rozliczono ten okres (ISO); null, gdy nigdy. */
    lastSettledAt: string | null;
}

/** Pozycja listy kontrahentów: ile każdy ma do rozliczenia w wybranym okresie. */
export interface ContractorOverview {
    contractor: BatchContractor;
    openCount: number;
    openNetCents: number;
    openGrossCents: number;
    settledCount: number;
    lastSettledAt: string | null;
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

/**
 * Bez `addToFinances`: backend nigdy tej flagi nie obsłużył, a okno obiecywało
 * „dokument finansowy", którego nie było. Wróci razem z obsługą po stronie serwera.
 */
export interface SettlementRequest {
    from: string;
    to: string;
    sendEmail: boolean;
    emailOverride?: string;
    mode: SettlementMode;
}

export interface SettlementResult {
    closedEntryCount: number;
    totalNetCents: number;
    totalGrossCents: number;
    emailRequested: boolean;
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
