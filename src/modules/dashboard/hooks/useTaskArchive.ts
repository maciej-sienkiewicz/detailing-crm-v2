import { useQuery } from '@tanstack/react-query';
import { taskArchiveApi } from '../api/tasksApi';

const PAGE_SIZE = 20;

/** `enabled`: archiwum jest oknem - zamknięte nie pyta (dawniej przy każdym wejściu na pulpit). */
export const useTaskArchive = (page: number, search: string, enabled = true) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tasks', 'archive', page, search],
    queryFn: ({ signal }) => taskArchiveApi.list({ page, pageSize: PAGE_SIZE, search: search || undefined }, signal),
    enabled,
  });

  return {
    items: data?.items ?? [],
    pageMeta: data?.page,
    isLoading,
    isError,
  };
};
