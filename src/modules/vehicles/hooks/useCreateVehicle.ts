import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { CreateVehiclePayload } from '../types';

export const useCreateVehicle = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: CreateVehiclePayload) => vehicleApi.createVehicle(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        },
    });

    return {
        createVehicle: mutation.mutate,
        isCreating: mutation.isPending,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
};