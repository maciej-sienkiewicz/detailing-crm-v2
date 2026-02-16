import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { vehicleDetailQueryKey } from './useVehicleDetail';

export const useDeleteVehiclePhoto = (vehicleId: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (photoId: string) =>
            vehicleApi.deleteVehiclePhoto(vehicleId, photoId),
        onSuccess: () => {
            // Invalidate all photo gallery queries for this vehicle
            queryClient.invalidateQueries({
                queryKey: ['vehicle', vehicleId, 'photos', 'gallery']
            });
            // Also invalidate vehicle detail to refresh mini gallery
            queryClient.invalidateQueries({
                queryKey: vehicleDetailQueryKey(vehicleId)
            });
        },
    });

    return {
        deletePhoto: mutation.mutate,
        deletePhotoAsync: mutation.mutateAsync,
        isDeleting: mutation.isPending,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
};
