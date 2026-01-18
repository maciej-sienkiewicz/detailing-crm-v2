import type {Customer, CustomerRevenue, CreateCustomerPayload, Vehicle, CustomerVehiclesResponse} from '../types';
import type { CreateCustomerFormData } from './customerValidation';

// Backend vehicle response type (different from frontend Vehicle type)
interface BackendVehicle {
    id: string;
    brand: string;
    model: string;
    year: number;
    licensePlate: string;
}

export const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency,
    }).format(amount);
};

export const formatRevenue = (revenue: CustomerRevenue): string => {
    const net = formatCurrency(revenue.netAmount, revenue.currency);
    const gross = formatCurrency(revenue.grossAmount, revenue.currency);
    return `${net} / ${gross}`;
};

export const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—';

    return new Intl.DateTimeFormat('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(dateString));
};

export const formatPhoneNumber = (phone: string): string => {
    const clean = phone.replace(/[\s-]/g, '').replace(/^\+48/, '');
    return `+48 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
};

export const getFullName = (customer: Customer): string => {
    return `${customer.firstName} ${customer.lastName}`;
};

export const mapFormDataToPayload = (
    data: CreateCustomerFormData
): CreateCustomerPayload => ({
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.replace(/[\s-]/g, ''),
    homeAddress: data.homeAddress ?? null,
    companyData: data.company ?? null,
    notes: data.notes.trim(),
});

export const mapBackendVehicleToVehicle = (backendVehicle: BackendVehicle): Vehicle => ({
    id: backendVehicle.id,
    make: backendVehicle.brand,
    model: backendVehicle.model,
    year: backendVehicle.year,
    licensePlate: backendVehicle.licensePlate,
    color: '—',
    mileage: 0,
    nextInspectionDate: null,
    nextServiceDate: null,
    addedAt: new Date().toISOString(),
    status: 'active',
});

export const mapBackendVehiclesResponse = (backendVehicles: BackendVehicle[]): CustomerVehiclesResponse => ({
    vehicles: backendVehicles.map(mapBackendVehicleToVehicle),
    totalCount: backendVehicles.length,
});