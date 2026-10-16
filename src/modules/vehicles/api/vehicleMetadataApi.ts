// src/modules/vehicles/api/vehicleMetadataApi.ts
import { apiClient } from '@/core/apiClient';
import type { VehicleKind } from '../vehicleKind';

export interface BrandWithModels {
  marka: string;
  modele: string[];
}

export const vehicleMetadataApi = {
  /** Katalog marek i modeli danego rodzaju; samochody i motocykle mają osobne listy. */
  async getAll(kind: VehicleKind = 'CAR'): Promise<BrandWithModels[]> {
    const res = await apiClient.get('/v1/vehicle-metadata', { params: { kind } });
    return res.data as BrandWithModels[];
  },
};
