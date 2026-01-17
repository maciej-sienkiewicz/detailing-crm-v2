// src/modules/operations/types.ts

export type OperationStatus =
    | 'IN_PROGRESS'
    | 'READY_FOR_PICKUP'
    | 'COMPLETED'
    | 'REJECTED'
    | 'ARCHIVED';

export type OperationType = 'VISIT' | 'RESERVATION';

export type FilterStatus = OperationStatus | 'RESERVATIONS';

export interface OperationVehicle {
    brand: string;
    model: string;
    licensePlate: string;
}

export interface OperationFinancials {
    netAmount: number;
    grossAmount: number;
    currency: string;
}

export interface LastModification {
    timestamp: string;
    performedBy: {
        firstName: string;
        lastName: string;
    };
}

export interface Operation {
    id: string;
    type: OperationType;
    customerFirstName: string;
    customerLastName: string;
    customerPhone: string;
    status: OperationStatus;
    vehicle: OperationVehicle | null;
    startDateTime: string;
    endDateTime: string;
    financials: OperationFinancials;
    lastModification: LastModification;
}

export interface OperationListResponse {
    data: Operation[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

export interface OperationFilters {
    search: string;
    page: number;
    limit: number;
    type?: OperationType;
    status?: OperationStatus;
    sortBy?: 'startDateTime' | 'customerLastName' | 'grossAmount' | 'lastModification';
    sortDirection?: 'asc' | 'desc';
}