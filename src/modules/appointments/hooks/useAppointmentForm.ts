// src/modules/appointments/hooks/useAppointmentForm.ts
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { appointmentApi } from '../api/appointmentApi';

export const useCustomerSearch = (query: string) => {
    return useQuery({
        queryKey: ['appointments', 'customers', 'search', query],
        queryFn: () => appointmentApi.searchCustomers(query),
        enabled: query.length >= 0,
        // Hold the previous matches on screen while the next query is in flight: emptying
        // the list between keystrokes makes a search picker flicker and, in a fixed-height
        // list, is the difference between a calm result set and a strobe.
        placeholderData: keepPreviousData,
    });
};

export const useCustomerVehicles = (customerId: string | undefined) => {
    return useQuery({
        queryKey: ['appointments', 'customers', customerId, 'vehicles'],
        queryFn: () => appointmentApi.getCustomerVehicles(customerId!),
        enabled: !!customerId,
    });
};

