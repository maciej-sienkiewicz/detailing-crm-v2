export interface TrackedKeyword {
  keyword: string;
  lastFetchedAt?: string;
}

export interface KeywordHistoryData {
  keyword: string;
  locationCode: number;
  locationName: string;
  monthlySearches: Array<{ year: number; month: number; searchVolume: number | null }>;
  dailyTrend: Array<{ date: string; trendIndex: number | null }>;
}

export interface Location {
  locationCode: number;
  locationName: string;
  polishName?: string;
  geoLevel: 'country' | 'voivodeship';
}

export type Granularity = 'monthly' | 'daily';

export const CHART_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#06B6D4',
  '#F97316',
  '#EC4899',
] as const;
