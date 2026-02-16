import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';

export const vehiclePhotoGalleryQueryKey = (vehicleId: string, page: number, pageSize: number) =>
    ['vehicle', vehicleId, 'photos', 'gallery', page, pageSize];

export const useVehiclePhotoGallery = (vehicleId: string, page: number = 1, pageSize: number = 20) => {
    const query = useQuery({
        queryKey: vehiclePhotoGalleryQueryKey(vehicleId, page, pageSize),
        queryFn: () => vehicleApi.getPhotoGallery(vehicleId, page, pageSize),
        enabled: !!vehicleId,
    });

    return {
        photos: query.data?.photos ?? [],
        pagination: query.data?.pagination ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
};
