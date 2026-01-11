import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { AssignOwnerPayload } from '../types';
import { vehicleDetailQueryKey } from './useVehicleDetail';

export const useOwnerManagement = (vehicleId: string) => {
    const queryClient = useQueryClient();

    const assignMutation = useMutation({
        mutationFn: (payload: AssignOwnerPayload) => vehicleApi.assignOwner(vehicleId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleDetailQueryKey(vehicleId) });
        },
    });

    const removeMutation = useMutation({
        mutationFn: (customerId: string) => vehicleApi.removeOwner(vehicleId, customerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleDetailQueryKey(vehicleId) });
        },
    });

    return {
        assignOwner: assignMutation.mutate,
        isAssigning: assignMutation.isPending,
        removeOwner: removeMutation.mutate,
        isRemoving: removeMutation.isPending,
    };
};