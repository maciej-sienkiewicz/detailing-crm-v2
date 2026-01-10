import { apiClient } from '@/core';
import type { AppointmentCreateRequest, Service, Customer, Vehicle, AppointmentColor } from '../types';

const USE_MOCKS = true;

const mockServices: Service[] = [
    { id: '1', name: 'Przegląd okresowy', basePriceNet: 25000, vatRate: 23, category: 'Serwis' },
    { id: '2', name: 'Wymiana oleju', basePriceNet: 15000, vatRate: 23, category: 'Serwis' },
    { id: '3', name: 'Diagnostyka komputerowa', basePriceNet: 10000, vatRate: 23, category: 'Diagnostyka' },
    { id: '4', name: 'Naprawa zawieszenia', basePriceNet: 80000, vatRate: 23, category: 'Naprawa' },
    { id: '5', name: 'Wymiana klocków hamulcowych', basePriceNet: 35000, vatRate: 23, category: 'Naprawa' },
];

const mockCustomers: Customer[] = [
    { id: '1', firstName: 'Jan', lastName: 'Kowalski', phone: '+48 123 456 789', email: 'jan.kowalski@example.com' },
    { id: '2', firstName: 'Anna', lastName: 'Nowak', phone: '+48 987 654 321', email: 'anna.nowak@example.com' },
    { id: '3', firstName: 'Piotr', lastName: 'Wiśniewski', phone: '+48 555 666 777', email: 'piotr.wisniewski@example.com' },
    { id: '4', firstName: 'Maria', lastName: 'Wójcik', phone: '+48 601 234 567', email: 'maria.wojcik@example.com' },
    { id: '5', firstName: 'Tomasz', lastName: 'Kamiński', phone: '+48 602 345 678', email: 'tomasz.kaminski@example.com' },
    { id: '6', firstName: 'Katarzyna', lastName: 'Lewandowska', phone: '+48 603 456 789', email: 'katarzyna.lewandowska@example.com' },
    { id: '7', firstName: 'Michał', lastName: 'Zieliński', phone: '+48 604 567 890', email: 'michal.zielinski@example.com' },
    { id: '8', firstName: 'Magdalena', lastName: 'Szymańska', phone: '+48 605 678 901', email: 'magdalena.szymanska@example.com' },
    { id: '9', firstName: 'Paweł', lastName: 'Woźniak', phone: '+48 606 789 012', email: 'pawel.wozniak@example.com' },
    { id: '10', firstName: 'Agnieszka', lastName: 'Dąbrowska', phone: '+48 607 890 123', email: 'agnieszka.dabrowska@example.com' },
];

const mockVehicles: Vehicle[] = [
    { id: '1', brand: 'Volkswagen', model: 'Golf', year: 2020, licensePlate: 'WA 12345' },
    { id: '2', brand: 'BMW', model: '320d', year: 2019, licensePlate: 'KR 98765' },
    { id: '3', brand: 'Audi', model: 'A4', year: 2021, licensePlate: 'GD 11111' },
];

const mockAppointmentColors: AppointmentColor[] = [
    { id: '1', name: 'Oklejanie PPF', hexColor: '#ef4444' },
    { id: '2', name: 'Mechanika - Jan Kowalski', hexColor: '#22c55e' },
    { id: '3', name: 'Diagnostyka', hexColor: '#3b82f6' },
    { id: '4', name: 'Pilne', hexColor: '#f97316' },
    { id: '5', name: 'Standardowe', hexColor: '#6366f1' },
];

const mockCreateAppointment = async (data: AppointmentCreateRequest): Promise<{ id: string }> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log('Mock: Creating appointment', data);
    return { id: `appointment-${Date.now()}` };
};

const mockGetServices = async (): Promise<Service[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockServices;
};

const mockSearchCustomers = async (query: string): Promise<Customer[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (!query) return mockCustomers;
    const lowerQuery = query.toLowerCase();
    return mockCustomers.filter(c =>
        c.firstName.toLowerCase().includes(lowerQuery) ||
        c.lastName.toLowerCase().includes(lowerQuery) ||
        c.email.toLowerCase().includes(lowerQuery)
    );
};

const mockGetCustomerVehicles = async (customerId: string): Promise<Vehicle[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockVehicles.filter((_, i) => i < 2);
};

const mockGetAppointmentColors = async (): Promise<AppointmentColor[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockAppointmentColors;
};

export const appointmentApi = {
    createAppointment: async (data: AppointmentCreateRequest): Promise<{ id: string }> => {
        if (USE_MOCKS) {
            return mockCreateAppointment(data);
        }
        const response = await apiClient.post('/api/appointments', data);
        return response.data;
    },

    getServices: async (): Promise<Service[]> => {
        if (USE_MOCKS) {
            return mockGetServices();
        }
        const response = await apiClient.get('/api/services');
        return response.data;
    },

    searchCustomers: async (query: string): Promise<Customer[]> => {
        if (USE_MOCKS) {
            return mockSearchCustomers(query);
        }
        const response = await apiClient.get('/api/customers/search', { params: { q: query } });
        return response.data;
    },

    getCustomerVehicles: async (customerId: string): Promise<Vehicle[]> => {
        if (USE_MOCKS) {
            return mockGetCustomerVehicles(customerId);
        }
        const response = await apiClient.get(`/api/customers/${customerId}/vehicles`);
        return response.data;
    },

    getAppointmentColors: async (): Promise<AppointmentColor[]> => {
        if (USE_MOCKS) {
            return mockGetAppointmentColors();
        }
        const response = await apiClient.get('/api/appointment-colors');
        return response.data;
    },
};