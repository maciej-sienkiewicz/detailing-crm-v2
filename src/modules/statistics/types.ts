// src/modules/statistics/types.ts

export interface Category {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
    serviceCount: number;
    serviceIds: string[];
    createdAt: string;
    updatedAt: string;
}

export interface CategoryService {
    serviceId: string;
    serviceName: string;
    isActive: boolean;
}

export interface CategoryDetail extends Category {
    services: CategoryService[];
}

export interface StatsDataPoint {
    period: string;
    orderCount: number;
    totalRevenueGross: number;
}

export interface StatsTotals {
    orderCount: number;
    totalRevenueGross: number;
}

export type Granularity = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface CategoryStats {
    categoryId: string;
    categoryName: string;
    granularity: Granularity;
    startDate: string;
    endDate: string;
    data: StatsDataPoint[];
    totals: StatsTotals;
}

export interface ServiceBreakdownItem {
    serviceId: string;
    serviceName: string;
    isActive: boolean;
    totals: StatsTotals;
}

export interface CategoryBreakdownItem {
    categoryId: string;
    categoryName: string;
    description: string | null;
    color: string | null;
    totals: StatsTotals;
    services: ServiceBreakdownItem[];
}

export interface BreakdownStats {
    period: {
        granularity: Granularity;
        startDate: string;
        endDate: string;
    };
    overview: {
        data: StatsDataPoint[];
        totals: StatsTotals;
    };
    categories: CategoryBreakdownItem[];
    unassignedServices: ServiceBreakdownItem[];
}

export interface CreateCategoryRequest {
    name: string;
    description?: string | null;
    color?: string | null;
}

export interface UpdateCategoryRequest {
    name: string;
    description?: string | null;
    color?: string | null;
}

// ─── Period Detail (visit drill-down) ─────────────────────────────────────────

export interface PeriodVisitService {
    serviceId: string;
    serviceName: string;
    priceGross: number;
    /** true when a category filter is active and this service belongs to it */
    inCategory?: boolean;
    /** Aktywna kategoria usługi - panel rozkłada na nią sprzedaż okresu. */
    categoryId?: string | null;
    /** Brutto uzgodnione przed wydaniem, gdy cena zmieniła się przy wydaniu. */
    priceBeforeHandoverGross?: number | null;
    /**
     * Dokumenty, którymi rozliczono usługę (id z PeriodVisit.documents): część brutto usługi
     * i jej netto - kwota innego dokumentu (bez VAT). Starszy serwer nie podaje netto.
     */
    documents?: Array<{ documentId: string; gross: number; net?: number | null }>;
}

/** Dokument rozliczenia wizyty (faktura, inny dokument bez VAT, paragon). */
export interface PeriodVisitDocument {
    documentId: string;
    number: string;
    type: 'INVOICE' | 'RECEIPT' | 'OTHER' | string;
    withoutReceipt: boolean;
    invoicedExternally: boolean;
    paymentMethod: string;
    gross: number;
}

export interface PeriodVisit {
    visitId: string;
    visitDate: string;
    clientName: string;
    vehicleInfo: string;
    /** Revenue from category-filtered services only (equals revenueGrossAll when no filter) */
    totalRevenueGross: number;
    /** Full visit revenue regardless of filter */
    totalRevenueGrossAll: number;
    services: PeriodVisitService[];
    /** Obowiązujące dokumenty wizyty; puste dla wizyt sprzed zapisu podziału. */
    documents?: PeriodVisitDocument[];
    /** Rabat (+) albo dopłata (−) przy wydaniu, brutto. */
    handoverDiscountGross?: number;
}

export interface PeriodDetail {
    period: string;
    granularity: Granularity;
    orderCount: number;
    /** Revenue from category-filtered services only */
    totalRevenueGross: number;
    /** Full period revenue regardless of filter */
    totalRevenueGrossAll: number;
    /** Category name when a filter is active, null otherwise */
    categoryName: string | null;
    visits: PeriodVisit[];
}

// ─── Delay Statistics ─────────────────────────────────────────────────────────

