// src/modules/operations/types.ts

// Statusy wizyt
export type VisitStatus =
    | 'IN_PROGRESS'
    | 'READY_FOR_PICKUP'
    | 'COMPLETED'
    | 'REJECTED'
    | 'ARCHIVED';

// Statusy rezerwacji
export type AppointmentStatus =
    | 'CREATED'
    | 'ABANDONED'
    | 'CANCELLED'
    | 'CONVERTED';

export type OperationStatus = VisitStatus | AppointmentStatus;

export type OperationType = 'VISIT' | 'RESERVATION';

export type FilterStatus = VisitStatus | 'RESERVATIONS';

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
    scheduledDate?: string;
    sortBy?: 'startDateTime' | 'customerLastName' | 'grossAmount' | 'lastModification';
    sortDirection?: 'asc' | 'desc';
}
