import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { vehicleKeys } from '../api/vehicleKeys';

export const vehiclePhotoGalleryQueryKey = vehicleKeys.galleryPage;

export const useVehiclePhotoGallery = (vehicleId: string, page: number = 1, pageSize: number = 20) => {
    const query = useQuery({
        queryKey: vehiclePhotoGalleryQueryKey(vehicleId, page, pageSize),
        queryFn: () => vehicleApi.getPhotoGallery(vehicleId, page, pageSize),
        enabled: !!vehicleId,
    });

    return {
        photos: query.data?.items ?? [],
        pageMeta: query.data?.page ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
};
