// src/modules/operations/types.ts
import type { RecurrenceInfo } from '@/modules/appointments/types';

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

export type FilterStatus = VisitStatus | 'RESERVATIONS' | 'DELETED';

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

export type SmsSendStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface OperationConfirmationSms {
    status: 'SENT' | 'FAILED';
    sentAt: string;
}

export interface OperationReminderSms {
    requested: boolean;
    status: SmsSendStatus | null;
    sentAt: string | null;
    editable: boolean;
}

export interface OperationSmsInfo {
    confirmationSms: OperationConfirmationSms | null;
    reminderSms: OperationReminderSms;
}

export interface Operation {
    id: string;
    type: OperationType;
    title?: string;
    customerFirstName: string;
    customerLastName: string;
    customerPhone: string;
    status: OperationStatus;
    vehicle: OperationVehicle | null;
    startDateTime: string;
    endDateTime: string;
    financials: OperationFinancials;
    lastModification: LastModification;
    smsInfo?: OperationSmsInfo;
    recurrenceInfo?: RecurrenceInfo | null;
    deletedAt?: string | null;
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
    deleted?: boolean;
}
