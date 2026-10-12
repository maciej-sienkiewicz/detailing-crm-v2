import { apiClient } from '@/core';
import type { ScheduledSmsItem, ScheduledSmsOverview, SentSmsPage, UpdateScheduledSmsPayload } from '../types';

const BASE = '/scheduled-sms';

const itemPath = (item: Pick<ScheduledSmsItem, 'source' | 'id'>) => `${BASE}/${item.source}/${item.id}`;

// Akcje mają własne komunikaty w widoku - stąd `skipErrorToast`, żeby ogólny toast
// z apiClient nie powtarzał tego samego zdania drugi raz.
const local = { skipErrorToast: true } as const;

export const scheduledSmsApi = {
    async list(days: number): Promise<ScheduledSmsOverview> {
        const { data } = await apiClient.get<ScheduledSmsOverview>(BASE, { params: { days } });
        return data;
    },

    /** Historia wysłanych, od najnowszych; `before` to kursor z poprzedniej strony. */
    async sent(before: string | null): Promise<SentSmsPage> {
        const { data } = await apiClient.get<SentSmsPage>(`${BASE}/sent`, { params: before ? { before } : {} });
        return data;
    },

    async update(item: ScheduledSmsItem, payload: UpdateScheduledSmsPayload): Promise<void> {
        await apiClient.put(itemPath(item), payload, local);
    },

    async cancel(item: ScheduledSmsItem): Promise<void> {
        await apiClient.post(`${itemPath(item)}/cancel`, undefined, local);
    },

    async resume(item: ScheduledSmsItem): Promise<void> {
        await apiClient.post(`${itemPath(item)}/resume`, undefined, local);
    },
};
