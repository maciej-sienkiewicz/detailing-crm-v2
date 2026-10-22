// src/modules/vehicles/hooks/useVehicleMetadata.ts
import { useQuery } from '@tanstack/react-query';
import { vehicleMetadataApi, type BrandWithModels } from '../api/vehicleMetadataApi';
import type { VehicleKind, VehicleKindFilter } from '../vehicleKind';

export const vehicleMetadataQueryKey = (kind: VehicleKind) => ['vehicleMetadata', kind] as const;

/**
 * Katalog to plik w paczce backendu - zmienia się tylko z wdrożeniem. W pamięci trzymamy go
 * przez całą sesję (dawniej znikał po 5 minutach i formularz pobierał 70 KB od nowa), a między
 * wejściami do aplikacji serwuje go cache przeglądarki (ETag i max-age z backendu).
 */
export const vehicleMetadataQuery = (kind: VehicleKind) => ({
  queryKey: vehicleMetadataQueryKey(kind),
  queryFn: () => vehicleMetadataApi.getAll(kind),
  staleTime: Infinity,
  gcTime: Infinity,
});

/**
 * Marki obu katalogów w jednej liście - dla filtrów, w których marka jest po prostu
 * napisem do wyszukania („BMW" ma tam znaczyć auta i motocykle). Marki wspólne łączymy
 * bez względu na wielkość liter (katalog samochodów ma „Bmw", motocykli „BMW"),
 * zostawiając pisownię z katalogu samochodów, bo nią zapisane są istniejące pojazdy.
 */
export const mergeCatalogs = (cars: BrandWithModels[], motorcycles: BrandWithModels[]): BrandWithModels[] => {
  const byKey = new Map<string, BrandWithModels>();
  for (const entry of [...cars, ...motorcycles]) {
    const key = entry.marka.toLocaleLowerCase('pl');
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { marka: entry.marka, modele: [...entry.modele] });
      continue;
    }
    const known = new Set(existing.modele.map(m => m.toLocaleLowerCase('pl')));
    existing.modele.push(...entry.modele.filter(m => !known.has(m.toLocaleLowerCase('pl'))));
  }
  return [...byKey.values()];
};

export const useVehicleMetadata = (kind: VehicleKindFilter = 'CAR') => {
  const primary = useQuery<BrandWithModels[]>(vehicleMetadataQuery(kind === 'ALL' ? 'CAR' : kind));
  const motorcycles = useQuery<BrandWithModels[]>({
    ...vehicleMetadataQuery('MOTORCYCLE'),
    enabled: kind === 'ALL',
  });

  if (kind !== 'ALL') return primary;
  return {
    data: primary.data && motorcycles.data ? mergeCatalogs(primary.data, motorcycles.data) : primary.data,
    isLoading: primary.isLoading || motorcycles.isLoading,
  };
};
