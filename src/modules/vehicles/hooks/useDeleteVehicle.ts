import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { vehicleKeys } from '../api/vehicleKeys';

export const useDeleteVehicle = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (vehicleId: string) => vehicleApi.deleteVehicle(vehicleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleKeys.lists });
        },
    });

    return {
        deleteVehicle: mutation.mutate,
        isDeleting: mutation.isPending,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
};