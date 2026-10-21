import { useQuery } from '@tanstack/react-query';
import { CUSTOMER_VEHICLES_KEY, customerVehiclesQuery } from '../api/customerVehiclesQuery';
import { mapBackendVehiclesResponse } from '../utils/customerMappers';

export const useCustomerVehicles = (customerId: string, includeDeleted = false) => {
    const query = useQuery({
        ...customerVehiclesQuery(customerId, includeDeleted),
        select: mapBackendVehiclesResponse,
        enabled: !!customerId,
    });

    return {
        vehicles: query.data?.vehicles ?? [],
        totalCount: query.data?.totalCount ?? 0,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

export const customerVehiclesQueryKey = CUSTOMER_VEHICLES_KEY;
