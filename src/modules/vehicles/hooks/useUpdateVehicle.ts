import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { UpdateVehiclePayload } from '../types';
import { vehicleKeys } from '../api/vehicleKeys';

export const useUpdateVehicle = (vehicleId: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: UpdateVehiclePayload) => vehicleApi.updateVehicle(vehicleId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(vehicleId) });
            queryClient.invalidateQueries({ queryKey: vehicleKeys.lists });
        },
    });

    return {
        updateVehicle: mutation.mutate,
        isUpdating: mutation.isPending,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
};