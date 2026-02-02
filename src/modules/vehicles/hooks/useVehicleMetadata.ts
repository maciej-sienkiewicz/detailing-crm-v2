// src/modules/vehicles/hooks/useVehicleMetadata.ts
import { useQuery } from '@tanstack/react-query';
import { vehicleMetadataApi, type BrandWithModels } from '../api/vehicleMetadataApi';

export const VEHICLE_METADATA_QUERY_KEY = ['vehicleMetadata'] as const;

export const useVehicleMetadata = () => {
  return useQuery<BrandWithModels[]>({
    queryKey: VEHICLE_METADATA_QUERY_KEY,
    queryFn: () => vehicleMetadataApi.getAll(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
