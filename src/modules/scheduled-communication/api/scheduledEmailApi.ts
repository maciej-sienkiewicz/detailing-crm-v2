import { apiClient } from '@/core';
import type { ScheduledEmailItem, ScheduledEmailOverview, SentEmailPage, UpdateScheduledEmailPayload } from '../types';

const BASE = '/scheduled-email';

const itemPath = (item: Pick<ScheduledEmailItem, 'source' | 'id'>) => `${BASE}/${item.source}/${item.id}`;

// Jak w scheduledSmsApi: akcje mają własne komunikaty w widoku, ogólny toast by je dublował.
const local = { skipErrorToast: true } as const;

export const scheduledEmailApi = {
    async list(): Promise<ScheduledEmailOverview> {
        const { data } = await apiClient.get<ScheduledEmailOverview>(BASE);
        return data;
    },

    /** Historia wysłanych, od najnowszych; `before` to kursor z poprzedniej strony. */
    async sent(before: string | null): Promise<SentEmailPage> {
        const { data } = await apiClient.get<SentEmailPage>(`${BASE}/sent`, { params: before ? { before } : {} });
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
