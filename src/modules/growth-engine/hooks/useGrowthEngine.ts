/**
 * Growth Engine Data Hook
 * Manages market demand data fetching with location filtering
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { growthEngineApi } from '../api/growthEngineApi';
import type { GrowthEngineData, LocationFilter, ServiceIntent } from '../types';

export const GROWTH_ENGINE_KEY = ['growth-engine', 'data'] as const;

export const useGrowthEngine = () => {
  const [location, setLocation] = useState<LocationFilter>('PL');

  const { data, isLoading, isError, refetch } = useQuery<GrowthEngineData>({
    queryKey: [...GROWTH_ENGINE_KEY, location],
    queryFn: () => growthEngineApi.getData(location),
    staleTime: 5 * 60_000, // 5 minutes
  });

  // Top 5 by demand volume (for default chart lines)
  const top5ByVolume = useMemo(() => {
    if (!data) return [];
    return [...data.intents]
      .sort((a, b) => b.demandVolume - a.demandVolume)
      .slice(0, 5);
  }, [data]);

  // Top 10 by momentum (for trend monitor)
  const top10ByMomentum = useMemo(() => {
    if (!data) return [];
    return [...data.intents]
      .filter((i) => i.momentum > 0)
      .sort((a, b) => b.momentum - a.momentum)
      .slice(0, 10);
  }, [data]);

  // Opportunities (not in offer, sorted by demand)
  const opportunities = useMemo(() => {
    if (!data) return [];
    return [...data.intents]
      .filter((i) => !i.inOffer)
      .sort((a, b) => b.demandVolume - a.demandVolume);
  }, [data]);

  // All intents for the comparison dropdown
  const allIntents = useMemo(() => {
    if (!data) return [];
    return [...data.intents].sort((a, b) => b.demandVolume - a.demandVolume);
  }, [data]);

  // Location display name
  const locationName = useMemo(() => {
    if (location === 'PL') return 'Cała Polska';
    const voi = data?.locations.find((l) => l.code === location);
    return voi ? `woj. ${voi.name}` : 'Cała Polska';
  }, [location, data]);

  return {
    // Data
    intents: data?.intents ?? [],
    allIntents,
    top5ByVolume,
    top10ByMomentum,
    opportunities,
    locations: data?.locations ?? [],
    lastUpdated: data?.lastUpdated,
    locationName,

    // State
    location,
    setLocation,
    isLoading,
    isError,

    // Actions
    refetch,
  };
};

/**
 * Hook for managing which intents are visible on the seasonality chart
 */
export const useChartSelection = (top5: ServiceIntent[]) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize with top 5 when they arrive
  const effectiveIds = useMemo(() => {
    if (selectedIds.size > 0) return selectedIds;
    return new Set(top5.map((i) => i.id));
  }, [selectedIds, top5]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev.size > 0 ? prev : top5.map((i) => i.id));
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isSelected = (id: string) => effectiveIds.has(id);

  return { selectedIds: effectiveIds, toggle, isSelected };
};
