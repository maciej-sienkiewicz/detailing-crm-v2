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
            paintType?: string;
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
            paintType?: string;
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
    appointmentColorId: string;
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
}

export interface SelectedVehicle {
    id?: string;
    brand: string;
    model: string;
    isNew: boolean;
}
