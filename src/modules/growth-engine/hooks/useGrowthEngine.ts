import { useState, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { trendsApi } from '../api/trendsApi';
import { CHART_COLORS } from '../types';
import type { Granularity } from '../types';

export const GROWTH_ENGINE_KEY = ['growth-engine'] as const;

const MONTH_SHORT = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

function normalizeTo100(values: (number | null)[]): number[] {
  const max = Math.max(...values.map((v) => v ?? 0), 1);
  return values.map((v) => Math.round(((v ?? 0) / max) * 100));
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const useGrowthEngine = () => {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [locationCode, setLocationCode] = useState(2616);
  const [granularity, setGranularity] = useState<Granularity>('monthly');

  const {
    data: keywordsData,
    isLoading: keywordsLoading,
    isError: keywordsError,
  } = useQuery({
    queryKey: ['trends', 'keywords'],
    queryFn: () => trendsApi.getKeywords(),
  });

  const allKeywords = useMemo(() => keywordsData ?? [], [keywordsData]);

  const effectiveSelected = useMemo(() => {
    if (selectedKeywords.length > 0) return selectedKeywords;
    return allKeywords.slice(0, 3).map((k) => k.keyword);
  }, [selectedKeywords, allKeywords]);

  const firstKeyword = allKeywords[0]?.keyword;

  const { data: locationsData } = useQuery({
    queryKey: ['trends', 'locations', firstKeyword],
    queryFn: () => trendsApi.getVoivodeships(firstKeyword!),
    enabled: !!firstKeyword,
  });

  const from = granularity === 'daily' ? daysAgo(90) : undefined;

  const historyQueries = useQueries({
    queries: effectiveSelected.map((keyword) => ({
      queryKey: ['trends', 'history', keyword, locationCode, granularity],
      queryFn: () => trendsApi.getKeywordHistory(keyword, locationCode, from),
    })),
  });

  const isLoading = keywordsLoading || historyQueries.some((q) => q.isLoading && !q.data);
  const isError = keywordsError || historyQueries.every((q) => q.isError);

  const chartData = useMemo(() => {
    const loaded = historyQueries
      .map((q, i) => ({ keyword: effectiveSelected[i], data: q.data, color: CHART_COLORS[i % CHART_COLORS.length] }))
      .filter((item): item is typeof item & { data: NonNullable<typeof item.data> } => !!item.data);

    if (loaded.length === 0) return [];

    if (granularity === 'monthly') {
      const sortedPoints = [...loaded[0].data.monthlySearches].sort(
        (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month),
      );

      return sortedPoints.map((point, idx) => {
        const entry: Record<string, string | number> = {
          name: `${MONTH_SHORT[point.month - 1]} ${point.year}`,
        };
        loaded.forEach(({ keyword, data }) => {
          const vals = [...data.monthlySearches]
            .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))
            .map((p) => p.searchVolume);
          entry[keyword] = normalizeTo100(vals)[idx] ?? 0;
        });
        return entry;
      });
    } else {
      const sortedDates = [...loaded[0].data.dailyTrend].sort((a, b) =>
        a.date.localeCompare(b.date),
      );

      return sortedDates.map((point, idx) => {
        const entry: Record<string, string | number> = { name: point.date.slice(5) };
        loaded.forEach(({ keyword, data }) => {
          const sorted = [...data.dailyTrend].sort((a, b) => a.date.localeCompare(b.date));
          entry[keyword] = sorted[idx]?.trendIndex ?? 0;
        });
        return entry;
      });
    }
  }, [historyQueries, effectiveSelected, granularity]);

  const keywordColors = useMemo(
    () =>
      Object.fromEntries(
        effectiveSelected.map((kw, i) => [kw, CHART_COLORS[i % CHART_COLORS.length]]),
      ),
    [effectiveSelected],
  );

  const locations = useMemo(() => locationsData ?? [], [locationsData]);

  const locationName = useMemo(() => {
    if (locationCode === 2616) return 'Cała Polska';
    const loc = locations.find((l) => l.locationCode === locationCode);
    return loc?.polishName ?? loc?.locationName ?? 'Nieznana lokalizacja';
  }, [locationCode, locations]);

  const toggle = (keyword: string) => {
    setSelectedKeywords((prev) => {
      const base = prev.length > 0 ? prev : allKeywords.slice(0, 3).map((k) => k.keyword);
      return base.includes(keyword) ? base.filter((k) => k !== keyword) : [...base, keyword];
    });
  };

  const isSelected = (keyword: string) => effectiveSelected.includes(keyword);

  return {
    allKeywords,
    effectiveSelected,
    chartData,
    keywordColors,
    locations,
    locationName,
    locationCode,
    setLocationCode,
    granularity,
    setGranularity,
    isLoading,
    isError,
    toggle,
    isSelected,
    refetch: () => historyQueries.forEach((q) => q.refetch()),
  };
};

