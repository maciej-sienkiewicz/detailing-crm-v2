import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasksApi';
import type { CreateTaskPayload, UpdateTaskPayload, DashboardTask } from '../types';

export const TASKS_QUERY_KEY = ['tasks'] as const;

export const useTasks = () => {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: tasksApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.create(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previous = queryClient.getQueryData(TASKS_QUERY_KEY);
      const tempTask: DashboardTask = {
        id: `temp_${Date.now()}`,
        title: payload.title,
        meta: payload.meta ?? '',
        done: false,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(TASKS_QUERY_KEY, (old: DashboardTask[] = []) => [tempTask, ...old]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(TASKS_QUERY_KEY, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      tasksApi.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previous = queryClient.getQueryData(TASKS_QUERY_KEY);
      queryClient.setQueryData(TASKS_QUERY_KEY, (old: DashboardTask[] = []) =>
        old.map(t => t.id === id ? { ...t, ...payload } : t)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(TASKS_QUERY_KEY, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previous = queryClient.getQueryData(TASKS_QUERY_KEY);
      queryClient.setQueryData(TASKS_QUERY_KEY, (old: DashboardTask[] = []) =>
        old.filter(t => t.id !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(TASKS_QUERY_KEY, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });

  return {
    tasks,
    isLoading,
    isError,
    createTask: (payload: CreateTaskPayload) => createMutation.mutateAsync(payload),
    updateTask: (id: string, payload: UpdateTaskPayload) =>
      updateMutation.mutateAsync({ id, payload }),
    deleteTask: (id: string) => deleteMutation.mutate(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
