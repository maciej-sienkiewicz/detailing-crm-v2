// src/modules/vehicles/api/vehicleMetadataApi.ts
import { apiClient } from '@/core/apiClient';

export interface BrandWithModels {
  marka: string;
  modele: string[];
}

export const vehicleMetadataApi = {
  async getAll(): Promise<BrandWithModels[]> {
    const res = await apiClient.get('/v1/vehicle-metadata');
    return res.data as BrandWithModels[];
  },
};
