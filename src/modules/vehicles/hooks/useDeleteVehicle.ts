import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';

export const useDeleteVehicle = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (vehicleId: string) => vehicleApi.deleteVehicle(vehicleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        },
    });

    return {
        deleteVehicle: mutation.mutate,
        isDeleting: mutation.isPending,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
};