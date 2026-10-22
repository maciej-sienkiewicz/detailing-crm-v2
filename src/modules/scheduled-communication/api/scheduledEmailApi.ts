import { apiClient } from '@/core';
import type { CursorPage } from '@/core/page';
import type { ScheduledEmailItem, ScheduledEmailOverview, SentEmailItem, UpdateScheduledEmailPayload } from '../types';
import type { BackgroundRequestConfig } from '@/core/backgroundRequest';

const BASE = '/v1/scheduled-email';

const itemPath = (item: Pick<ScheduledEmailItem, 'source' | 'id'>) => `${BASE}/${item.source}/${item.id}`;

// Jak w scheduledSmsApi: akcje mają własne komunikaty w widoku, ogólny toast by je dublował.
const local = { skipErrorToast: true } as const;

export const scheduledEmailApi = {
    async list(config?: BackgroundRequestConfig): Promise<ScheduledEmailOverview> {
        const { data } = await apiClient.get<ScheduledEmailOverview>(BASE, config);
        return data;
    },

    /** Historia wysłanych, od najnowszych; `cursor` to `nextCursor` poprzedniej strony. */
    async sent(cursor: string | null): Promise<CursorPage<SentEmailItem>> {
        const { data } = await apiClient.get<CursorPage<SentEmailItem>>(`${BASE}/sent`, { params: cursor ? { cursor } : {} });
        return data;
    },

    async update(item: ScheduledEmailItem, payload: UpdateScheduledEmailPayload): Promise<void> {
        await apiClient.put(itemPath(item), payload, local);
    },

    async cancel(item: ScheduledEmailItem): Promise<void> {
        await apiClient.post(`${itemPath(item)}/cancel`, undefined, local);
    },

    async resume(item: ScheduledEmailItem): Promise<void> {
        await apiClient.post(`${itemPath(item)}/resume`, undefined, local);
    },
};
