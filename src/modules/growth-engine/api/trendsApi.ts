import { apiClient } from '@/core/apiClient';
import type { TrackedKeyword, KeywordHistoryData, Location } from '../types';

export const trendsApi = {
  getKeywords: async (): Promise<TrackedKeyword[]> => {
    const response = await apiClient.get('/trends/keywords');
    return response.data.keywords;
  },

  getKeywordHistory: async (
    keyword: string,
    locationCode = 2616,
    from?: string,
  ): Promise<KeywordHistoryData> => {
    const response = await apiClient.get(
      `/trends/keywords/${encodeURIComponent(keyword)}/history`,
      { params: { locationCode, ...(from ? { from } : {}) } },
    );
    return response.data;
  },

  getVoivodeships: async (keyword: string): Promise<Location[]> => {
    const response = await apiClient.get(
      `/trends/voivodeships/${encodeURIComponent(keyword)}`,
    );
    return response.data.locations;
  },
};
