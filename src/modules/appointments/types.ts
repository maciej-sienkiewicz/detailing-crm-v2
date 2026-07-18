// src/modules/appointments/types.ts
export type MoneyAmount = number;

export type AdjustmentType = 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';

export interface PriceAdjustment {
    type: AdjustmentType;
    value: number;
}

export type CustomerIdentity =
    | {
        mode: 'EXISTING';
        id: string;
    }
    | {
        mode: 'NEW';
        newData: {
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
            email: string | null;
            company?: {
                name: string;
                nip: string;
                regon?: string;
                address: string;
            };
        };
    }
    | {
        mode: 'UPDATE';
        id: string;
        updateData: {
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
            email: string | null;
            company?: {
                name: string;
                nip: string;
                regon?: string;
                address: string;
            };
        };
    };

export type VehicleIdentity =
    | {
        mode: 'EXISTING';
        id: string;
    }
    | {
        mode: 'NEW';
        newData: {
            brand: string;
            model: string;
            yearOfProduction?: number;
            licensePlate?: string;
            color?: string;
        };
    }
    | {
        mode: 'UPDATE';
        id: string;
        updateData: {
            brand: string;
            model: string;
            yearOfProduction?: number;
            licensePlate?: string;
            color?: string;
        };
    }
    | {
        mode: 'NONE';
    };

export interface ServiceLineItem {
    id: string;
    serviceId: string;
    serviceName: string;
    basePriceNet: MoneyAmount;
    vatRate: number;
    requireManualPrice: boolean;
    adjustment: PriceAdjustment;
    note?: string;
}

export interface AppointmentCreateRequest {
    customer: CustomerIdentity;
    vehicle: VehicleIdentity;
    services: ServiceLineItem[];
    schedule: {
        isAllDay: boolean;
        /** Instant (UTC ISO-8601 with trailing 'Z') */
        startDateTime: string;
        /** Instant (UTC ISO-8601 with trailing 'Z') */
        endDateTime: string;
    };
    appointmentTitle?: string;
    note?: string;
    appointmentColorId: string;
    sendConfirmationSms?: boolean;
    sendReminderSms?: boolean;
    recurrence?: RecurrenceRuleRequest;
    doorToDoor?: {
        pickupCity: string;
        pickupStreet: string;
        deliveryCity: string;
        deliveryStreet: string;
        notes?: string;
    };
}

export type SmsStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface ConfirmationSmsInfo {
    status: 'SENT' | 'FAILED';
    sentAt: string;
}

export interface ReminderSmsInfo {
    requested: boolean;
    status: SmsStatus | null;
    sentAt: string | null;
    editable: boolean;
}

export interface AppointmentSmsInfo {
    confirmationSms: ConfirmationSmsInfo | null;
    reminderSms: ReminderSmsInfo;
}

export interface Service {
    id: string;
    name: string;
    basePriceNet: MoneyAmount;
    vatRate: number;
    requireManualPrice: boolean;
    category: string;
}

export interface Customer {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
}

export interface Vehicle {
    id: string;
    brand: string;
    model: string;
    year: number;
    licensePlate: string;
}

export interface AppointmentColor {
    id: string;
    name: string;
    hexColor: string;
}

export interface SelectedCustomer {
    id?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    isNew: boolean;
    hasUpdates?: boolean;
}

export interface SelectedVehicle {
    id?: string;
    brand: string;
    model: string;
    year?: number;
    isNew: boolean;
}

// ─── Recurrence types ─────────────────────────────────────────────────────────

export type RecurrenceType = 'WEEKLY' | 'MONTHLY';
export type RecurrenceEndType = 'COUNT' | 'DATE' | 'OPEN';
export type RecurrenceEditScope = 'THIS' | 'THIS_AND_FUTURE' | 'ALL';

export type DayOfWeek =
    | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'
    | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface RecurrenceRuleRequest {
    type: RecurrenceType;
    // WEEKLY only
    intervalWeeks?: number;
    daysOfWeek?: DayOfWeek[];
    // MONTHLY only
    dayOfMonth?: number;
    // End condition
    endType: RecurrenceEndType;
    maxOccurrences?: number;
    endDate?: string;
}

export interface RecurrenceInfo {
    seriesId: string;
    recurrenceIndex: number;
    totalInSeries: number;
    isDetached: boolean;
}

export interface CreateRecurringAppointmentResponse {
    seriesId: string;
    occurrenceCount: number;
    firstAppointmentId: string;
    customerId: string;
    vehicleId: string | null;
}

export interface RecurrenceSeriesResponse {
    id: string;
    type: RecurrenceType;
    intervalWeeks: number | null;
    daysOfWeek: DayOfWeek[] | null;
    dayOfMonth: number | null;
    endType: RecurrenceEndType;
    endDate: string | null;
    maxOccurrences: number | null;
    isOpenEnded: boolean;
    totalOccurrences: number;
    createdAt: string;
}
