import { apiClient } from '@/core/apiClient';

const BASE_PATH = '/v1/my/tasks';

/** Task visible to the authenticated user, with a per-user unread flag. */
export interface MyTask {
    id: string;
    title: string;
    meta: string | null;
    done: boolean;
    createdAt: string;
    createdByUserName: string | null;
    completedAt: string | null;
    unread: boolean;
}

export interface MyTasksSummary {
    /** Visible, not completed. */
    pendingCount: number;
    /** Visible, not completed, never seen by this user. */
    unreadCount: number;
}

/**
 * Self-service task API ("Powiadomienia") — no permission required; the backend
 * returns only tasks visible to the caller (targeted at them, their role, or
 * the whole studio).
 */
export const myTasksApi = {
    list: async (): Promise<MyTask[]> => {
        const { data } = await apiClient.get<MyTask[]>(BASE_PATH);
        return data;
    },

    summary: async (): Promise<MyTasksSummary> => {
        const { data } = await apiClient.get<MyTasksSummary>(`${BASE_PATH}/summary`);
        return data;
    },

    markAllRead: async (): Promise<MyTasksSummary> => {
        const { data } = await apiClient.post<MyTasksSummary>(`${BASE_PATH}/mark-read`);
        return data;
    },

    setDone: async (taskId: string, done: boolean): Promise<void> => {
        await apiClient.patch(`${BASE_PATH}/${taskId}/done`, { done });
    },
};
