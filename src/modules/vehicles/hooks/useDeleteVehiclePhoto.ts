import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { vehicleKeys } from '../api/vehicleKeys';

export const useDeleteVehiclePhoto = (vehicleId: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (photoId: string) =>
            vehicleApi.deleteVehiclePhoto(vehicleId, photoId),
        onSuccess: () => {
            // Invalidate all photo gallery queries for this vehicle
            queryClient.invalidateQueries({ queryKey: vehicleKeys.gallery(vehicleId) });
            // Szczegóły niosą miniatury - osobny klucz, więc galeria nie idzie drugi raz.
            queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(vehicleId) });
            // Moduł galerii trzyma odpowiedź 5 minut - usunięte zdjęcie wisiało tam dalej.
            queryClient.invalidateQueries({ queryKey: ['gallery'] });
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
