import { apiClient } from '@/core/apiClient';
import type {
    Customer,
    CustomerListResponse,
    CustomerFilters,
    CreateCustomerPayload,
    CustomerSortField,
    SortDirection,
} from '../types';

const CUSTOMERS_BASE_PATH = '/api/v1/customers';
const USE_MOCKS = false;

const mockCustomers: Customer[] = [
    {
        id: '1',
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
        notes: 'Stały klient, preferuje kontakt telefoniczny',
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
    },
    {
        id: '2',
        firstName: 'Anna',
        lastName: 'Nowak',
        contact: {
            email: 'anna.nowak@firma.pl',
            phone: '+48987654321',
        },
        homeAddress: {
            street: 'ul. Kwiatowa 25',
            city: 'Kraków',
            postalCode: '30-001',
            country: 'Polska',
        },
        company: null,
        notes: '',
        lastVisitDate: '2025-01-05',
        totalVisits: 5,
        vehicleCount: 1,
        totalRevenue: {
            netAmount: 12000,
            grossAmount: 14760,
            currency: 'PLN',
        },
        createdAt: '2024-02-20T09:00:00Z',
        updatedAt: '2025-01-05T11:45:00Z',
    },
    {
        id: '3',
        firstName: 'Piotr',
        lastName: 'Wiśniewski',
        contact: {
            email: 'p.wisniewski@autoflota.pl',
            phone: '+48555666777',
        },
        homeAddress: null,
        company: {
            id: 'c2',
            name: 'AutoFlota S.A.',
            nip: '9876543210',
            regon: '987654321',
            address: {
                street: 'ul. Logistyczna 100',
                city: 'Poznań',
                postalCode: '60-001',
                country: 'Polska',
            },
        },
        notes: 'Flota firmowa - 15 pojazdów',
        lastVisitDate: '2025-01-10',
        totalVisits: 28,
        vehicleCount: 15,
        totalRevenue: {
            netAmount: 180000,
            grossAmount: 221400,
            currency: 'PLN',
        },
        createdAt: '2022-11-10T08:00:00Z',
        updatedAt: '2025-01-10T16:30:00Z',
    },
    {
        id: '4',
        firstName: 'Maria',
        lastName: 'Dąbrowska',
        contact: {
            email: 'maria.dabrowska@gmail.com',
            phone: '+48111222333',
        },
        homeAddress: {
            street: 'ul. Słoneczna 8',
            city: 'Gdańsk',
            postalCode: '80-001',
            country: 'Polska',
        },
        company: null,
        notes: 'Klientka VIP',
        lastVisitDate: '2024-12-20',
        totalVisits: 8,
        vehicleCount: 2,
        totalRevenue: {
            netAmount: 32000,
            grossAmount: 39360,
            currency: 'PLN',
        },
        createdAt: '2023-03-05T14:00:00Z',
        updatedAt: '2024-12-20T10:15:00Z',
    },
    {
        id: '5',
        firstName: 'Tomasz',
        lastName: 'Lewandowski',
        contact: {
            email: 'tomek.lewa@wp.pl',
            phone: '+48444555666',
        },
        homeAddress: {
            street: 'ul. Sportowa 22',
            city: 'Wrocław',
            postalCode: '50-001',
            country: 'Polska',
        },
        company: {
            id: 'c3',
            name: 'Transport Lewandowski',
            nip: '5551234567',
            regon: '555123456',
            address: {
                street: 'ul. Transportowa 1',
                city: 'Wrocław',
                postalCode: '50-002',
                country: 'Polska',
            },
        },
        notes: '',
        lastVisitDate: '2025-01-09',
        totalVisits: 15,
        vehicleCount: 8,
        totalRevenue: {
            netAmount: 95000,
            grossAmount: 116850,
            currency: 'PLN',
        },
        createdAt: '2023-01-12T11:30:00Z',
        updatedAt: '2025-01-09T09:00:00Z',
    },
    {
        id: '6',
        firstName: 'Katarzyna',
        lastName: 'Zielińska',
        contact: {
            email: 'k.zielinska@onet.pl',
            phone: '+48777888999',
        },
        homeAddress: {
            street: 'ul. Parkowa 15',
            city: 'Łódź',
            postalCode: '90-001',
            country: 'Polska',
        },
        company: null,
        notes: 'Nowy klient',
        lastVisitDate: '2025-01-10',
        totalVisits: 1,
        vehicleCount: 1,
        totalRevenue: {
            netAmount: 2500,
            grossAmount: 3075,
            currency: 'PLN',
        },
        createdAt: '2025-01-10T10:00:00Z',
        updatedAt: '2025-01-10T10:00:00Z',
    },
    {
        id: '7',
        firstName: 'Michał',
        lastName: 'Szymański',
        contact: {
            email: 'michal.szymanski@techcars.pl',
            phone: '+48222333444',
        },
        homeAddress: null,
        company: {
            id: 'c4',
            name: 'TechCars Sp. z o.o.',
            nip: '7771234567',
            regon: '777123456',
            address: {
                street: 'ul. Techniczna 50',
                city: 'Katowice',
                postalCode: '40-001',
                country: 'Polska',
            },
        },
        notes: 'Serwis floty elektrycznej',
        lastVisitDate: '2025-01-07',
        totalVisits: 22,
        vehicleCount: 12,
        totalRevenue: {
            netAmount: 145000,
            grossAmount: 178350,
            currency: 'PLN',
        },
        createdAt: '2022-08-20T13:00:00Z',
        updatedAt: '2025-01-07T15:45:00Z',
    },
    {
        id: '8',
        firstName: 'Agnieszka',
        lastName: 'Woźniak',
        contact: {
            email: 'a.wozniak@luxauto.pl',
            phone: '+48999000111',
        },
        homeAddress: {
            street: 'ul. Luksusowa 1',
            city: 'Warszawa',
            postalCode: '00-100',
            country: 'Polska',
        },
        company: {
            id: 'c5',
            name: 'LuxAuto Premium',
            nip: '8881234567',
            regon: '888123456',
            address: {
                street: 'ul. Elegancka 10',
                city: 'Warszawa',
                postalCode: '00-101',
                country: 'Polska',
            },
        },
        notes: 'Klient premium - samochody luksusowe',
        lastVisitDate: '2025-01-06',
        totalVisits: 35,
        vehicleCount: 6,
        totalRevenue: {
            netAmount: 320000,
            grossAmount: 393600,
            currency: 'PLN',
        },
        createdAt: '2021-05-10T09:30:00Z',
        updatedAt: '2025-01-06T14:00:00Z',
    },
    {
        id: '9',
        firstName: 'Robert',
        lastName: 'Kamiński',
        contact: {
            email: 'robert.kaminski@gmail.com',
            phone: '+48333444555',
        },
        homeAddress: {
            street: 'ul. Górska 30',
            city: 'Zakopane',
            postalCode: '34-500',
            country: 'Polska',
        },
        company: null,
        notes: '',
        lastVisitDate: '2024-11-15',
        totalVisits: 3,
        vehicleCount: 1,
        totalRevenue: {
            netAmount: 8500,
            grossAmount: 10455,
            currency: 'PLN',
        },
        createdAt: '2024-05-20T16:00:00Z',
        updatedAt: '2024-11-15T12:30:00Z',
    },
    {
        id: '10',
        firstName: 'Ewa',
        lastName: 'Pawlak',
        contact: {
            email: 'ewa.pawlak@budowtrans.pl',
            phone: '+48666777888',
        },
        homeAddress: null,
        company: {
            id: 'c6',
            name: 'BudoTrans Sp. z o.o.',
            nip: '6661234567',
            regon: '666123456',
            address: {
                street: 'ul. Budowlana 25',
                city: 'Lublin',
                postalCode: '20-001',
                country: 'Polska',
            },
        },
        notes: 'Flota pojazdów ciężarowych',
        lastVisitDate: '2025-01-04',
        totalVisits: 18,
        vehicleCount: 10,
        totalRevenue: {
            netAmount: 210000,
            grossAmount: 258300,
            currency: 'PLN',
        },
        createdAt: '2022-03-15T10:00:00Z',
        updatedAt: '2025-01-04T11:20:00Z',
    },
    {
        id: '11',
        firstName: 'Krzysztof',
        lastName: 'Grabowski',
        contact: {
            email: 'k.grabowski@express.pl',
            phone: '+48123123123',
        },
        homeAddress: {
            street: 'ul. Szybka 5',
            city: 'Szczecin',
            postalCode: '70-001',
            country: 'Polska',
        },
        company: {
            id: 'c7',
            name: 'Express Kurier',
            nip: '4441234567',
            regon: '444123456',
            address: {
                street: 'ul. Kurierska 12',
                city: 'Szczecin',
                postalCode: '70-002',
                country: 'Polska',
            },
        },
        notes: 'Obsługa kurierska regionu',
        lastVisitDate: '2025-01-09',
        totalVisits: 45,
        vehicleCount: 20,
        totalRevenue: {
            netAmount: 280000,
            grossAmount: 344400,
            currency: 'PLN',
        },
        createdAt: '2021-02-01T08:00:00Z',
        updatedAt: '2025-01-09T17:00:00Z',
    },
    {
        id: '12',
        firstName: 'Magdalena',
        lastName: 'Krawczyk',
        contact: {
            email: 'magda.krawczyk@mail.com',
            phone: '+48456456456',
        },
        homeAddress: {
            street: 'ul. Cicha 18',
            city: 'Bydgoszcz',
            postalCode: '85-001',
            country: 'Polska',
        },
        company: null,
        notes: 'Preferuje kontakt mailowy',
        lastVisitDate: '2024-12-10',
        totalVisits: 6,
        vehicleCount: 2,
        totalRevenue: {
            netAmount: 18000,
            grossAmount: 22140,
            currency: 'PLN',
        },
        createdAt: '2023-09-10T12:00:00Z',
        updatedAt: '2024-12-10T14:30:00Z',
    },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const sortCustomers = (
    customers: Customer[],
    sortBy: CustomerSortField = 'lastName',
    sortDirection: SortDirection = 'asc'
): Customer[] => {
    const sorted = [...customers].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'lastName':
                comparison = a.lastName.localeCompare(b.lastName, 'pl');
                break;
            case 'lastVisitDate':
                const dateA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
                const dateB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
                comparison = dateA - dateB;
                break;
            case 'totalVisits':
                comparison = a.totalVisits - b.totalVisits;
                break;
            case 'totalRevenue':
                comparison = a.totalRevenue.grossAmount - b.totalRevenue.grossAmount;
                break;
            case 'vehicleCount':
                comparison = a.vehicleCount - b.vehicleCount;
                break;
            case 'createdAt':
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                break;
            default:
                comparison = 0;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
};

const mockGetCustomers = async (filters: CustomerFilters): Promise<CustomerListResponse> => {
    await delay(500);

    let filteredCustomers = [...mockCustomers];

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredCustomers = filteredCustomers.filter(customer => {
            const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
            const companyNip = customer.company?.nip || '';
            const companyName = customer.company?.name.toLowerCase() || '';

            return (
                fullName.includes(searchLower) ||
                companyNip.includes(filters.search) ||
                companyName.includes(searchLower)
            );
        });
    }

    const sortedCustomers = sortCustomers(
        filteredCustomers,
        filters.sortBy,
        filters.sortDirection
    );

    const totalItems = sortedCustomers.length;
    const totalPages = Math.ceil(totalItems / filters.limit);
    const startIndex = (filters.page - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    const paginatedCustomers = sortedCustomers.slice(startIndex, endIndex);

    return {
        data: paginatedCustomers,
        pagination: {
            currentPage: filters.page,
            totalPages,
            totalItems,
            itemsPerPage: filters.limit,
        },
    };
};

const mockCreateCustomer = async (payload: CreateCustomerPayload): Promise<Customer> => {
    await delay(800);

    const newCustomer: Customer = {
        id: `${Date.now()}`,
        firstName: payload.firstName,
        lastName: payload.lastName,
        contact: {
            email: payload.email,
            phone: payload.phone,
        },
        homeAddress: payload.homeAddress,
        company: payload.companyData ? { id: `c${Date.now()}`, ...payload.companyData } : null,
        notes: payload.notes,
        lastVisitDate: null,
        totalVisits: 0,
        vehicleCount: 0,
        totalRevenue: {
            netAmount: 0,
            grossAmount: 0,
            currency: 'PLN',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    mockCustomers.unshift(newCustomer);

    return newCustomer;
};

const mockGetCustomerById = async (customerId: string): Promise<Customer> => {
    await delay(300);

    const customer = mockCustomers.find(c => c.id === customerId);

    if (!customer) {
        throw new Error('Customer not found');
    }

    return customer;
};

const mockUpdateCustomer = async (
    customerId: string,
    payload: Partial<CreateCustomerPayload>
): Promise<Customer> => {
    await delay(600);

    const customerIndex = mockCustomers.findIndex(c => c.id === customerId);

    if (customerIndex === -1) {
        throw new Error('Customer not found');
    }

    const existingCustomer = mockCustomers[customerIndex];

    const updatedCustomer: Customer = {
        ...existingCustomer,
        firstName: payload.firstName ?? existingCustomer.firstName,
        lastName: payload.lastName ?? existingCustomer.lastName,
        contact: {
            email: payload.email ?? existingCustomer.contact.email,
            phone: payload.phone ?? existingCustomer.contact.phone,
        },
        homeAddress: payload.homeAddress !== undefined ? payload.homeAddress : existingCustomer.homeAddress,
        company: payload.companyData !== undefined
            ? payload.companyData
                ? { id: existingCustomer.company?.id ?? `c${Date.now()}`, ...payload.companyData }
                : null
            : existingCustomer.company,
        notes: payload.notes ?? existingCustomer.notes,
        updatedAt: new Date().toISOString(),
    };

    mockCustomers[customerIndex] = updatedCustomer;

    return updatedCustomer;
};

const mockDeleteCustomer = async (customerId: string): Promise<void> => {
    await delay(400);

    const customerIndex = mockCustomers.findIndex(c => c.id === customerId);

    if (customerIndex === -1) {
        throw new Error('Customer not found');
    }

    mockCustomers.splice(customerIndex, 1);
};

export const customerApi = {
    getCustomers: async (filters: CustomerFilters): Promise<CustomerListResponse> => {
        if (USE_MOCKS) {
            return mockGetCustomers(filters);
        }

        const params = new URLSearchParams({
            page: filters.page.toString(),
            limit: filters.limit.toString(),
        });

        if (filters.search) {
            params.append('search', filters.search);
        }

        if (filters.sortBy) {
            params.append('sortBy', filters.sortBy);
        }

        if (filters.sortDirection) {
            params.append('sortDirection', filters.sortDirection);
        }

        const response = await apiClient.get<CustomerListResponse>(
            `${CUSTOMERS_BASE_PATH}?${params.toString()}`
        );
        return response.data;
    },

    getCustomerById: async (customerId: string): Promise<Customer> => {
        if (USE_MOCKS) {
            return mockGetCustomerById(customerId);
        }

        const response = await apiClient.get<Customer>(
            `${CUSTOMERS_BASE_PATH}/${customerId}`
        );
        return response.data;
    },

    createCustomer: async (payload: CreateCustomerPayload): Promise<Customer> => {
        if (USE_MOCKS) {
            return mockCreateCustomer(payload);
        }

        const response = await apiClient.post<Customer>(
            CUSTOMERS_BASE_PATH,
            payload
        );
        return response.data;
    },

    updateCustomer: async (
        customerId: string,
        payload: Partial<CreateCustomerPayload>
    ): Promise<Customer> => {
        if (USE_MOCKS) {
            return mockUpdateCustomer(customerId, payload);
        }

        const response = await apiClient.patch<Customer>(
            `${CUSTOMERS_BASE_PATH}/${customerId}`,
            payload
        );
        return response.data;
    },

    deleteCustomer: async (customerId: string): Promise<void> => {
        if (USE_MOCKS) {
            return mockDeleteCustomer(customerId);
        }

        await apiClient.delete(`${CUSTOMERS_BASE_PATH}/${customerId}`);
    },
};