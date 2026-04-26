import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasksApi';
import type { CreateTaskPayload, UpdateTaskPayload } from '../types';

export const TASKS_QUERY_KEY = ['tasks'] as const;

export const useTasks = () => {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: tasksApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      tasksApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
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
