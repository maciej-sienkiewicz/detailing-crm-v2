// src/modules/statistics/types.ts

export interface Category {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
    serviceCount: number;
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

export interface ServiceStats {
    serviceId: string;
    serviceName: string;
    isActive: boolean;
    granularity: Granularity;
    startDate: string;
    endDate: string;
    data: StatsDataPoint[];
    totals: StatsTotals;
}

export interface OverviewStats {
    granularity: Granularity;
    startDate: string;
    endDate: string;
    data: StatsDataPoint[];
    totals: StatsTotals;
    unassignedServiceCount: number;
}

export interface UnassignedService {
    serviceId: string;
    serviceName: string;
    basePriceNet: number;
    vatRate: number;
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
