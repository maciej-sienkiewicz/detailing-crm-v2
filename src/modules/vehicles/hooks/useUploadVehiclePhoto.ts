import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { UploadVehiclePhotoPayload } from '../types';
import { vehiclePhotoGalleryQueryKey } from './useVehiclePhotoGallery';
import { vehicleDetailQueryKey } from './useVehicleDetail';

export const useUploadVehiclePhoto = (vehicleId: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: UploadVehiclePhotoPayload) =>
            vehicleApi.uploadVehiclePhoto(vehicleId, payload),
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
        uploadPhoto: mutation.mutate,
        uploadPhotoAsync: mutation.mutateAsync,
        isUploading: mutation.isPending,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
        data: mutation.data,
    };
};
