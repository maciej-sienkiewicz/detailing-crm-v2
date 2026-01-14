// src/modules/appointments/types.ts
export type MoneyAmount = number;

export type AdjustmentType = 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';

export interface PriceAdjustment {
    type: AdjustmentType;
    value: number;
}

export interface CustomerIdentity {
    mode: 'EXISTING' | 'NEW' | 'ALIAS';
    id?: string;
    alias?: string;
    newData?: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
        company?: {
            name: string;
            nip: string;
            regon?: string;
            address: string;
        };
    };
}

export interface VehicleIdentity {
    mode: 'EXISTING' | 'NEW' | 'NONE';
    id?: string;
    newData?: {
        brand: string;
        model: string;
    };
}

export interface ServiceLineItem {
    id: string;
    serviceId: string;
    serviceName: string;
    basePriceNet: MoneyAmount;
    vatRate: number;
    adjustment: PriceAdjustment;
    note?: string;
}

export interface AppointmentCreateRequest {
    customer: CustomerIdentity;
    vehicle: VehicleIdentity;
    services: ServiceLineItem[];
    schedule: {
        isAllDay: boolean;
        startDateTime: string;
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
    category: string;
}

export interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
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
    alias?: string;
    isNew: boolean;
    isAlias: boolean;
}

export interface SelectedVehicle {
    id?: string;
    brand: string;
    model: string;
    isNew: boolean;
}