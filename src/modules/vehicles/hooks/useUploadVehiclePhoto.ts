import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { vehiclePhotoGalleryQueryKey } from './useVehiclePhotoGallery';
import { vehicleDetailQueryKey } from './useVehicleDetail';

interface UploadPhotoParams {
    file: File;
    description: string;
}

export const useUploadVehiclePhoto = (vehicleId: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async ({ file, description }: UploadPhotoParams) => {
            // Step 1: Get presigned URL from backend
            const { uploadUrl } = await vehicleApi.uploadVehiclePhoto(vehicleId, {
                fileName: file.name,
                description,
            });

            // Step 2: Upload file to S3 using presigned URL
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type,
                },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
            }

            return { success: true };
        },
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
    };
};
