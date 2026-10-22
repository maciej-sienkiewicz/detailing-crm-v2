import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { vehicleKeys } from '../api/vehicleKeys';

export const useVehicleComments = (vehicleId: string, page = 1, pageSize = 20) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: vehicleKeys.comments(vehicleId, page, pageSize),
        queryFn: () => vehicleApi.getComments(vehicleId, page, pageSize),
        enabled: !!vehicleId,
    });
    return {
        comments: data?.items ?? [],
        pageMeta: data?.page,
        isLoading,
        isError,
    };
};
