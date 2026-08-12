import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { myTasksApi, type MyTask } from '../api/myTasksApi';

export const MY_TASKS_KEY = ['my-tasks'] as const;
export const MY_TASKS_SUMMARY_KEY = ['my-tasks', 'summary'] as const;

export function useMyTasks() {
    return useQuery({
        queryKey: MY_TASKS_KEY,
        queryFn: myTasksApi.list,
    });
}

/**
 * Unread badge count for the "Powiadomienia" sidebar item. Polls every 60 s —
 * enable only for users who actually see the tab (no dashboard access), so the
 * request never fires for everyone else.
 */
export function useMyTasksUnreadCount(options?: { enabled?: boolean }): number {
    const { data } = useQuery({
        queryKey: MY_TASKS_SUMMARY_KEY,
        queryFn: myTasksApi.summary,
        select: summary => summary.unreadCount,
        refetchInterval: 60_000,
        enabled: options?.enabled ?? true,
    });
    return data ?? 0;
}

export function useMarkMyTasksRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: myTasksApi.markAllRead,
        onSuccess: summary => {
            queryClient.setQueryData(MY_TASKS_SUMMARY_KEY, summary);
        },
    });
}

export function useSetMyTaskDone() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, done }: { taskId: string; done: boolean }) =>
            myTasksApi.setDone(taskId, done),
        onMutate: async ({ taskId, done }) => {
            await queryClient.cancelQueries({ queryKey: MY_TASKS_KEY });
            const previous = queryClient.getQueryData<MyTask[]>(MY_TASKS_KEY);
            queryClient.setQueryData<MyTask[]>(MY_TASKS_KEY, tasks =>
                tasks?.map(t => (t.id === taskId ? { ...t, done } : t)),
            );
            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(MY_TASKS_KEY, context.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: MY_TASKS_KEY });
            queryClient.invalidateQueries({ queryKey: MY_TASKS_SUMMARY_KEY });
        },
    });
}
