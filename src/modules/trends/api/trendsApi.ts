import { apiClient } from '@/core/apiClient';
import type {
    LocationsResponse,
    KeywordsListResponse,
    KeywordHistoryResponse,
    DashboardSummary,
    VoivodeshipComparisonResponse,
    SortField,
} from '../types';

export const trendsApi = {
    getLocations: () =>
        apiClient.get<LocationsResponse>('/trends/locations'),

    getSummary: () =>
        apiClient.get<DashboardSummary>('/trends/summary'),

    getKeywords: (params: { locationCode?: number; sort?: SortField; status?: string }) =>
        apiClient.get<KeywordsListResponse>('/trends/keywords', { params }),

    getKeywordHistory: (
        keyword: string,
        params: { locationCode?: number; from?: string; to?: string }
    ) =>
        apiClient.get<KeywordHistoryResponse>(
            `/trends/keywords/${encodeURIComponent(keyword)}/history`,
            { params }
        ),

    getVoivodeshipComparison: (keyword: string) =>
        apiClient.get<VoivodeshipComparisonResponse>(
            `/trends/voivodeships/${encodeURIComponent(keyword)}`
        ),
};
