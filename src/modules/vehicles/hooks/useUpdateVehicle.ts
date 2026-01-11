import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { UpdateVehiclePayload } from '../types';
import { vehicleDetailQueryKey } from './useVehicleDetail';

export const useUpdateVehicle = (vehicleId: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: UpdateVehiclePayload) => vehicleApi.updateVehicle(vehicleId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleDetailQueryKey(vehicleId) });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        },
    });

    return {
        updateVehicle: mutation.mutate,
        isUpdating: mutation.isPending,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
};