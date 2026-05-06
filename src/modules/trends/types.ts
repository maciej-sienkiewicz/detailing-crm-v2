export interface KeywordListItem {
    keyword: string;
    searchVolume: number | null;
    cpc: number | null;
    competition: string | null;
    competitionIndex: number | null;
    lastFetchedAt: string | null;
}

export interface KeywordsListResponse {
    locationCode: number;
    locationName: string;
    totalKeywords: number;
    keywords: KeywordListItem[];
}

export interface CurrentMetrics {
    searchVolume: number | null;
    cpc: number | null;
    competition: string | null;
    competitionIndex: number | null;
}

export interface MonthlyPoint {
    year: number;
    month: number;
    searchVolume: number | null;
}

export interface DailyTrendPoint {
    date: string;
    trendIndex: number | null;
}

export interface KeywordHistoryResponse {
    keyword: string;
    locationCode: number;
    locationName: string;
    currentMetrics: CurrentMetrics | null;
    monthlySearches: MonthlyPoint[];
    dailyTrend: DailyTrendPoint[];
}

export interface SyncInfo {
    taskName: string;
    status: string;
    lastSuccessAt: string | null;
    details: string | null;
}

export interface LocationsSummary {
    country: string;
    voivodeshipCount: number;
}

export interface DashboardSummary {
    totalTrackedKeywords: number;
    topKeywordsByVolume: KeywordListItem[];
    syncStatuses: SyncInfo[];
    locations: LocationsSummary;
}

export interface VoivodeshipMetricItem {
    locationCode: number;
    locationName: string;
    polishName: string | null;
    geoLevel: string;
    searchVolume: number | null;
    cpc: number | null;
    competition: string | null;
}

export interface VoivodeshipComparisonResponse {
    keyword: string;
    locations: VoivodeshipMetricItem[];
}

export type SortField = 'volume' | 'cpc' | 'competition' | 'keyword';
