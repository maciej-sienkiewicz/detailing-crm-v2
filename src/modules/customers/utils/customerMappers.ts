import type {
    Customer,
    CustomerRevenue,
    CreateCustomerPayload,
    Vehicle,
    CustomerVehiclesResponse,
    Visit,
    CustomerVisitsResponse,
    PaginationMeta,
} from '../types';
import type { CreateCustomerFormData } from './customerValidation';

// Backend vehicle response type (different from frontend Vehicle type)
interface BackendVehicle {
    id: string;
    brand: string;
    model: string;
    year: number;
    licensePlate: string;
}

// Backend visit response type
interface BackendVisit {
    id: string;
    date: string;
    type: string; // lowercase string from backend
    vehicleId: string;
    vehicleName: string;
    description: string;
    totalCost: {
        netAmount: number;
        grossAmount: number;
        currency: string;
    };
    status: string;
    technician: string;
    notes: string;
}

// Backend visits response
interface BackendVisitsResponse {
    visits: BackendVisit[];
    pagination: PaginationMeta;
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
    firstName: (data.firstName || '').trim(),
    lastName: (data.lastName || '').trim(),
    email: (data.email || '').trim().toLowerCase(),
    phone: (data.phone || '').replace(/[\s-]/g, ''),
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
    vin: '—',
    engineType: 'GASOLINE',
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

export const mapBackendVisitToVisit = (backendVisit: BackendVisit): Visit => {
    // Map backend type string to frontend union type
    const visitType = (() => {
        const type = backendVisit.type.toLowerCase();
        switch (type) {
            case 'service':
                return 'service' as const;
            case 'repair':
                return 'repair' as const;
            case 'inspection':
                return 'inspection' as const;
            case 'consultation':
                return 'consultation' as const;
            default:
                return 'service' as const; // fallback
        }
    })();

    // Map backend status string to frontend union type
    const visitStatus = (() => {
        const status = backendVisit.status.toLowerCase();
        switch (status) {
            case 'completed':
                return 'completed' as const;
            case 'in-progress':
            case 'in_progress':
                return 'in-progress' as const;
            case 'scheduled':
                return 'scheduled' as const;
            case 'cancelled':
                return 'cancelled' as const;
            default:
                return 'scheduled' as const; // fallback
        }
    })();

    return {
        id: backendVisit.id,
        date: backendVisit.date,
        type: visitType,
        vehicleId: backendVisit.vehicleId,
        vehicleName: backendVisit.vehicleName,
        description: backendVisit.description,
        totalCost: {
            netAmount: backendVisit.totalCost.netAmount,
            grossAmount: backendVisit.totalCost.grossAmount,
            currency: backendVisit.totalCost.currency,
        },
        status: visitStatus,
        technician: backendVisit.technician,
        notes: backendVisit.notes,
    };
};

export const mapBackendVisitsResponse = (backendVisits: BackendVisitsResponse): CustomerVisitsResponse => ({
    visits: backendVisits.visits.map(mapBackendVisitToVisit),
    communications: [], // Backend currently doesn't return communications
    pagination: backendVisits.pagination,
});
