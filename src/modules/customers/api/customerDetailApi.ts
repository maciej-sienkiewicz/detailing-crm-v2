// src/modules/customers/api/customerDetailApi.ts

import { apiClient } from '@/core/apiClient';
import type {
    CustomerDetailData,
    CustomerVehiclesResponse,
    CustomerVisitsResponse,
    UpdateConsentPayload,
    AddVehiclePayload,
    Vehicle,
    MarketingConsent,
    Visit,
    CommunicationLog,
} from '../types';
import { mapBackendVehiclesResponse, mapBackendVisitsResponse } from '../utils/customerMappers';

const CUSTOMERS_BASE_PATH = '/v1/customers';
const USE_MOCKS = false;

// Backend vehicle response type
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
    vehicleId: string;
    vehicleName: string;
    description: string;
    totalCost: {
        netAmount: number;
        grossAmount: number;
        currency: string;
    };
    status: string;
    createdBy?: string;
    notes: string;
}

// Backend visits response
interface BackendVisitsResponse {
    visits: BackendVisit[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockMarketingConsents: MarketingConsent[] = [
    {
        id: 'consent-1',
        type: 'email',
        granted: true,
        grantedAt: '2023-06-15T10:30:00Z',
        revokedAt: null,
        lastModifiedBy: 'System',
    },
    {
        id: 'consent-2',
        type: 'sms',
        granted: true,
        grantedAt: '2023-06-15T10:30:00Z',
        revokedAt: null,
        lastModifiedBy: 'System',
    },
    {
        id: 'consent-3',
        type: 'phone',
        granted: false,
        grantedAt: null,
        revokedAt: '2024-03-10T14:20:00Z',
        lastModifiedBy: 'Jan Kowalski',
    },
    {
        id: 'consent-4',
        type: 'postal',
        granted: false,
        grantedAt: null,
        revokedAt: null,
        lastModifiedBy: 'System',
    },
];

const mockVehicles: Vehicle[] = [
    {
        id: 'v1',
        make: 'Volkswagen',
        model: 'Golf GTI',
        year: 2021,
        licensePlate: 'WA 12345',
        vin: 'WVWZZZ1K123456789',
        color: 'Czarny',
        engineType: 'GASOLINE',
        mileage: 45000,
        nextInspectionDate: '2025-06-15',
        nextServiceDate: '2025-03-01',
        addedAt: '2021-08-20T10:00:00Z',
        status: 'active',
    },
    {
        id: 'v2',
        make: 'Audi',
        model: 'A4 Avant',
        year: 2019,
        licensePlate: 'WA 67890',
        vin: 'WAUZZZ8K123456789',
        color: 'Biały',
        engineType: 'DIESEL',
        mileage: 78000,
        nextInspectionDate: '2025-08-20',
        nextServiceDate: '2025-02-15',
        addedAt: '2019-11-10T09:30:00Z',
        status: 'active',
    },
    {
        id: 'v3',
        make: 'BMW',
        model: 'X5',
        year: 2023,
        licensePlate: 'WA 11111',
        vin: 'WBAX5123456789012',
        color: 'Srebrny',
        engineType: 'HYBRID',
        mileage: 12000,
        nextInspectionDate: '2026-01-10',
        nextServiceDate: '2025-04-20',
        addedAt: '2023-01-15T14:00:00Z',
        status: 'active',
    },
];

const mockVisits: Visit[] = [
    {
        id: 'visit-1',
        date: '2025-01-08T09:00:00Z',
        vehicleId: 'v1',
        vehicleName: 'VW Golf GTI',
        description: 'Wymiana oleju i filtrów, kontrola zawieszenia',
        totalCost: {
            netAmount: 650,
            grossAmount: 800,
            currency: 'PLN',
        },
        status: 'completed',
        createdBy: 'Marek Nowak',
        notes: 'Zalecono wymianę klocków hamulcowych w ciągu 3 miesięcy',
    },
    {
        id: 'visit-2',
        date: '2024-12-15T11:30:00Z',
        vehicleId: 'v2',
        vehicleName: 'Audi A4 Avant',
        description: 'Przegląd okresowy + diagnostyka komputerowa',
        totalCost: {
            netAmount: 350,
            grossAmount: 430,
            currency: 'PLN',
        },
        status: 'completed',
        createdBy: 'Piotr Wiśniewski',
        notes: 'Wszystko w normie',
    },
    {
        id: 'visit-3',
        date: '2024-11-20T14:00:00Z',
        vehicleId: 'v1',
        vehicleName: 'VW Golf GTI',
        description: 'Naprawa klimatyzacji - wymiana sprężarki',
        totalCost: {
            netAmount: 1800,
            grossAmount: 2214,
            currency: 'PLN',
        },
        status: 'completed',
        createdBy: 'Tomasz Kowalczyk',
        notes: 'Gwarancja 12 miesięcy na części',
    },
    {
        id: 'visit-4',
        date: '2025-02-05T10:00:00Z',
        vehicleId: 'v3',
        vehicleName: 'BMW X5',
        description: 'Wymiana opon na letnie + wyważenie',
        totalCost: {
            netAmount: 0,
            grossAmount: 0,
            currency: 'PLN',
        },
        status: 'scheduled',
        createdBy: 'Marek Nowak',
        notes: 'Rezerwacja potwierdzona',
    },
];

const mockCommunications: CommunicationLog[] = [
    {
        id: 'comm-1',
        date: '2025-01-09T15:30:00Z',
        type: 'phone',
        direction: 'outbound',
        subject: 'Potwierdzenie terminu serwisu',
        summary: 'Potwierdzono termin serwisu BMW X5 na 5 lutego',
        performedBy: 'Anna Kwiatkowska',
    },
    {
        id: 'comm-2',
        date: '2025-01-05T10:15:00Z',
        type: 'email',
        direction: 'inbound',
        subject: 'Zapytanie o wymianę opon',
        summary: 'Klient zapytał o cennik wymiany opon letnich',
        performedBy: 'System',
    },
    {
        id: 'comm-3',
        date: '2024-12-20T09:00:00Z',
        type: 'sms',
        direction: 'outbound',
        subject: 'Przypomnienie o przeglądzie',
        summary: 'Wysłano SMS z przypomnieniem o zbliżającym się przeglądzie',
        performedBy: 'System',
    },
];

const mockGetCustomerDetail = async (customerId: string): Promise<CustomerDetailData> => {
    await delay(400);

    const mockCustomer = {
        id: customerId,
        firstName: 'Jan',
        lastName: 'Kowalski',
        contact: {
            email: 'jan.kowalski@example.com',
            phone: '+48123456789',
        },
        homeAddress: {
            street: 'ul. Marszałkowska 10',
            city: 'Warszawa',
            postalCode: '00-001',
            country: 'Polska',
        },
        company: {
            id: 'c1',
            name: 'Auto-Handel Kowalski Sp. z o.o.',
            nip: '1234567890',
            regon: '123456789',
            address: {
                street: 'ul. Przemysłowa 5',
                city: 'Warszawa',
                postalCode: '00-002',
                country: 'Polska',
            },
        },
        notes: 'Stały klient, preferuje kontakt telefoniczny. VIP - zawsze sprawdzać dostępność dodatkowych usług.',
        lastVisitDate: '2025-01-08',
        totalVisits: 12,
        vehicleCount: 3,
        totalRevenue: {
            netAmount: 45000,
            grossAmount: 55350,
            currency: 'PLN',
        },
        createdAt: '2023-06-15T10:30:00Z',
        updatedAt: '2025-01-08T14:20:00Z',
    };

    return {
        customer: mockCustomer,
        marketingConsents: mockMarketingConsents,
        loyaltyTier: 'gold',
        lifetimeValue: {
            netAmount: 45000,
            grossAmount: 55350,
            currency: 'PLN',
        },
        lastContactDate: '2025-01-09T15:30:00Z',
    };
};

const mockGetCustomerVehicles = async (_customerId: string): Promise<CustomerVehiclesResponse> => {
    await delay(300);

    return {
        vehicles: mockVehicles,
        totalCount: mockVehicles.length,
    };
};

const mockGetCustomerVisits = async (_customerId: string): Promise<CustomerVisitsResponse> => {
    await delay(350);

    return {
        visits: mockVisits,
        communications: mockCommunications,
        pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: mockVisits.length,
            itemsPerPage: 10,
        },
    };
};

const mockUpdateConsent = async (
    _customerId: string,
    payload: UpdateConsentPayload
): Promise<MarketingConsent> => {
    await delay(200);

    const consent = mockMarketingConsents.find(c => c.id === payload.consentId);
    if (!consent) {
        throw new Error('Consent not found');
    }

    const now = new Date().toISOString();
    return {
        ...consent,
        granted: payload.granted,
        grantedAt: payload.granted ? now : consent.grantedAt,
        revokedAt: !payload.granted ? now : null,
        lastModifiedBy: 'Jan Kowalski',
    };
};

const mockAddVehicle = async (
    _customerId: string,
    payload: AddVehiclePayload
): Promise<Vehicle> => {
    await delay(500);

    const newVehicle: Vehicle = {
        id: `v${Date.now()}`,
        ...payload,
        vin: '—',
        engineType: 'GASOLINE',
        nextInspectionDate: null,
        nextServiceDate: null,
        addedAt: new Date().toISOString(),
        status: 'active',
    };

    return newVehicle;
};

export const customerDetailApi = {
    getCustomerDetail: async (customerId: string): Promise<CustomerDetailData> => {
        if (USE_MOCKS) {
            return mockGetCustomerDetail(customerId);
        }

        const response = await apiClient.get<CustomerDetailData>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/detail`
        );
        return response.data;
    },

    getCustomerVehicles: async (customerId: string): Promise<CustomerVehiclesResponse> => {
        if (USE_MOCKS) {
            return mockGetCustomerVehicles(customerId);
        }

        const response = await apiClient.get<BackendVehicle[]>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/vehicles`
        );
        return mapBackendVehiclesResponse(response.data);
    },

    getCustomerVisits: async (customerId: string, page: number = 1, limit: number = 10): Promise<CustomerVisitsResponse> => {
        if (USE_MOCKS) {
            return mockGetCustomerVisits(customerId);
        }

        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        const response = await apiClient.get<BackendVisitsResponse>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/visits?${params.toString()}`
        );
        return mapBackendVisitsResponse(response.data);
    },

    updateConsent: async (
        customerId: string,
        payload: UpdateConsentPayload
    ): Promise<MarketingConsent> => {
        if (USE_MOCKS) {
            return mockUpdateConsent(customerId, payload);
        }

        const response = await apiClient.patch<MarketingConsent>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/consents/${payload.consentId}`,
            { granted: payload.granted }
        );
        return response.data;
    },

    addVehicle: async (customerId: string, payload: AddVehiclePayload): Promise<Vehicle> => {
        if (USE_MOCKS) {
            return mockAddVehicle(customerId, payload);
        }

        const response = await apiClient.post<Vehicle>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/vehicles`,
            payload
        );
        return response.data;
    },
};
