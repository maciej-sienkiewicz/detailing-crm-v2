import { apiClient } from '@/core/apiClient';
import type {
    Customer,
    CustomerListResponse,
    CustomerFilters,
    CreateCustomerPayload,
    
} from '../types';

const CUSTOMERS_BASE_PATH = '/v1/customers';

export const customerApi = {
    getCustomers: async (filters: CustomerFilters, signal?: AbortSignal): Promise<CustomerListResponse> => {
        const params = new URLSearchParams({
            page: filters.page.toString(),
            limit: filters.limit.toString(),
        });

        if (filters.search) params.append('search', filters.search);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);

        if (filters.customerType && filters.customerType !== 'all') {
            params.append('customerType', filters.customerType);
        }
        if (filters.services?.length) {
            filters.services.forEach(s => params.append('services', s));
        }
        if (filters.lastVisitWithinDays) {
            params.append('lastVisitWithinDays', filters.lastVisitWithinDays.toString());
        }
        if (filters.notVisitedSinceDays) {
            params.append('notVisitedSinceDays', filters.notVisitedSinceDays.toString());
        }
        if (filters.vehicleBrand) params.append('vehicleBrand', filters.vehicleBrand);
        if (filters.vehicleModel) params.append('vehicleModel', filters.vehicleModel);
        if (filters.minRevenue != null) params.append('minRevenue', filters.minRevenue.toString());
        if (filters.maxRevenue != null) params.append('maxRevenue', filters.maxRevenue.toString());
        if (filters.minVisits != null) params.append('minVisits', filters.minVisits.toString());
        if (filters.maxVisits != null) params.append('maxVisits', filters.maxVisits.toString());

        const response = await apiClient.get<CustomerListResponse>(
            `${CUSTOMERS_BASE_PATH}?${params.toString()}`,
            { signal },
        );
        return response.data;
    },

    getCustomerById: async (customerId: string): Promise<Customer> => {
        const response = await apiClient.get<Customer>(
            `${CUSTOMERS_BASE_PATH}/${customerId}`
        );
        return response.data;
    },

    createCustomer: async (payload: CreateCustomerPayload): Promise<Customer> => {
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
        const response = await apiClient.patch<Customer>(
            `${CUSTOMERS_BASE_PATH}/${customerId}`,
            payload
        );
        return response.data;
    },

    deleteCustomer: async (customerId: string): Promise<void> => {
        await apiClient.delete(`${CUSTOMERS_BASE_PATH}/${customerId}`);
    },

    exportCustomers: async (
        filters: Omit<CustomerFilters, 'page' | 'limit'>
    ): Promise<void> => {
        const params = new URLSearchParams();

        if (filters.search) params.append('search', filters.search);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);
        if (filters.customerType && filters.customerType !== 'all') {
            params.append('customerType', filters.customerType);
        }
        if (filters.services?.length) {
            filters.services.forEach(s => params.append('services', s));
        }
        if (filters.lastVisitWithinDays) {
            params.append('lastVisitWithinDays', filters.lastVisitWithinDays.toString());
        }
        if (filters.notVisitedSinceDays) {
            params.append('notVisitedSinceDays', filters.notVisitedSinceDays.toString());
        }
        if (filters.vehicleBrand) params.append('vehicleBrand', filters.vehicleBrand);
        if (filters.vehicleModel) params.append('vehicleModel', filters.vehicleModel);
        if (filters.minRevenue != null) params.append('minRevenue', filters.minRevenue.toString());
        if (filters.maxRevenue != null) params.append('maxRevenue', filters.maxRevenue.toString());
        if (filters.minVisits != null) params.append('minVisits', filters.minVisits.toString());
        if (filters.maxVisits != null) params.append('maxVisits', filters.maxVisits.toString());

        const response = await apiClient.get(
            `${CUSTOMERS_BASE_PATH}/export?${params.toString()}`,
            { responseType: 'blob', timeout: 120_000 }
        );

        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `klienci-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
};