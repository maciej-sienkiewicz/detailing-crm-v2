import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { AssignOwnerPayload } from '../types';
import { vehicleKeys } from '../api/vehicleKeys';
import { CUSTOMER_VEHICLES_KEY } from '@/modules/customers/api/customerVehiclesQuery';

export const useOwnerManagement = (vehicleId: string) => {
    const queryClient = useQueryClient();

    const assignMutation = useMutation({
        mutationFn: (payload: AssignOwnerPayload) => vehicleApi.assignOwner(vehicleId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(vehicleId) });
            // Właściciel się zmienił - lista aut w kartotece klienta też.
            queryClient.invalidateQueries({ queryKey: [CUSTOMER_VEHICLES_KEY] });
        },
    });

    const removeMutation = useMutation({
        mutationFn: (customerId: string) => vehicleApi.removeOwner(vehicleId, customerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(vehicleId) });
            // Właściciel się zmienił - lista aut w kartotece klienta też.
            queryClient.invalidateQueries({ queryKey: [CUSTOMER_VEHICLES_KEY] });
        },
    });

    return {
        assignOwner: assignMutation.mutate,
        isAssigning: assignMutation.isPending,
        removeOwner: removeMutation.mutate,
        isRemoving: removeMutation.isPending,
    };
};