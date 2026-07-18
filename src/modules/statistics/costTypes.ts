// src/modules/statistics/costTypes.ts

export interface CostCategory {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCostCategoryRequest {
    name: string;
    description?: string | null;
    color?: string | null;
}

export interface UpdateCostCategoryRequest {
    name: string;
    description?: string | null;
    color?: string | null;
}

export interface CostExpenseItem {
    id: string;
    invoiceId: string;
    invoiceNumber: string | null;
    sellerName: string | null;
    saleDate: string | null;
    lineNumber: number;
    name: string | null;
    unit: string | null;
    quantity: number | null;
    unitPriceNet: number | null;
    netValue: number | null;
    grossValue: number | null;
    vatRate: string | null;
    costCategoryId: string | null;
    costCategoryName: string | null;
}

export interface CostDataPoint {
    period: string;
    itemCount: number;
    totalCostGross: number;
}

export interface CostCategoryBreakdownItem {
    categoryId: string;
    categoryName: string;
    color: string | null;
    itemCount: number;
    totalCostGross: number;
}

export interface CostBreakdown {
    period: {
        granularity: string;
        startDate: string;
        endDate: string;
    };
    overview: {
        data: CostDataPoint[];
        totals: {
            itemCount: number;
            totalCostGross: number;
        };
    };
    categories: CostCategoryBreakdownItem[];
    unassignedItemCount: number;
    unassignedCostGross: number;
}

export type CostViewMode = 'INVOICE' | 'ITEM' | 'NAME';

/** Aggregated invoice row (mode = INVOICE) */
export interface CostInvoiceGroup {
    invoiceId: string;
    invoiceNumber: string | null;
    sellerName: string | null;
    saleDate: string | null;
    itemCount: number;
    totalGross: number;
    items: CostExpenseItem[];
    costCategoryId: string | null;
}

/** Deduplicated name group (mode = NAME) */
export interface CostNameGroup {
    name: string;
    itemCount: number;
    totalGross: number;
    items: CostExpenseItem[];
    costCategoryId: string | null;
}
