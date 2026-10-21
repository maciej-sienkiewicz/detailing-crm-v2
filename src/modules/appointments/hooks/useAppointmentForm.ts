// src/modules/appointments/hooks/useAppointmentForm.ts
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { appointmentApi } from '../api/appointmentApi';
import { customerVehiclesQuery } from '@/modules/customers/api/customerVehiclesQuery';

/**
 * Pusty `query` to przeglądanie listy (okno wyboru klienta); `enabled` pozwala wołającemu
 * nie pytać, dopóki okno jest zamknięte - dawniej zamknięte okna pobierały 50 klientów.
 */
export const useCustomerSearch = (query: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ['appointments', 'customers', 'search', query],
        queryFn: ({ signal }) => appointmentApi.searchCustomers(query, signal),
        enabled: options?.enabled ?? true,
        // Hold the previous matches on screen while the next query is in flight: emptying
        // the list between keystrokes makes a search picker flicker and, in a fixed-height
        // list, is the difference between a calm result set and a strobe.
        placeholderData: keepPreviousData,
    });
};

export const useCustomerVehicles = (customerId: string | undefined) => {
    return useQuery({ ...customerVehiclesQuery(customerId ?? ''), enabled: !!customerId });
};
