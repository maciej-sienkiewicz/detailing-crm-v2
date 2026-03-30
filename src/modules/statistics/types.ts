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

// ─── Delay Statistics ─────────────────────────────────────────────────────────

export interface DelayTrendPoint {
    period: string;
    avgDelayDays: number;
    visitCount: number;
    delayedCount: number;
}

export interface ServiceDelayItem {
    serviceId: string;
    serviceName: string;
    isActive: boolean;
    /** Liczba wizyt z opóźnieniem, w których wystąpiła ta usługa */
    occurrences: number;
    /** Łączna liczba wizyt, w których wystąpiła ta usługa */
    totalOccurrences: number;
    /** Średnia liczba dni opóźnienia gdy ta usługa jest w wizycie */
    avgDelayDays: number;
    /** Procent wizyt z tą usługą, które były opóźnione (0–100) */
    delayRatePct: number;
}

export interface DelayOverview {
    avgDelayDays: number;
    medianDelayDays: number;
    visitsWithDelay: number;
    totalVisitsCompleted: number;
    /** Procent wizyt z opóźnieniem (0–100) */
    delayRatePct: number;
    /** Procent wizyt zrealizowanych na czas (0–100) */
    onTimeRatePct: number;
    trend: DelayTrendPoint[];
}

export interface DelayStats {
    period: {
        granularity: Granularity;
        startDate: string;
        endDate: string;
    };
    overview: DelayOverview;
    services: ServiceDelayItem[];
}
