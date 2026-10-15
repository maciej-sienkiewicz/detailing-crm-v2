import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { photoUploadContentType, putToPresignedUrl } from '@/common/utils/presignedUpload';
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
            const { uploadUrl, photoId } = await vehicleApi.uploadVehiclePhoto(vehicleId, {
                fileName: file.name,
                description,
            });

            // Step 2: Upload file to S3 using presigned URL. Nagłówek musi być tym, który
            // podpisał serwer (liczony z rozszerzenia nazwy) - `file.type` dawał 403 dla
            // .heic, .gif i plików bez rozszerzenia.
            try {
                await putToPresignedUrl(uploadUrl, file, photoUploadContentType(file.name));
            } catch (error) {
                // Rekord zdjęcia już jest - bez sprzątnięcia w galerii zostawał pusty kafelek.
                await vehicleApi.deleteVehiclePhoto(vehicleId, photoId).catch(() => undefined);
                throw error;
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
            // Moduł galerii trzyma odpowiedź 5 minut.
            queryClient.invalidateQueries({ queryKey: ['gallery'] });
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
