import { useQuery } from '@tanstack/react-query';
import { taskArchiveApi } from '../api/tasksApi';

const PAGE_SIZE = 20;

export const useTaskArchive = (page: number, search: string) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tasks', 'archive', page, search],
    queryFn: () => taskArchiveApi.list({ page, size: PAGE_SIZE, search: search || undefined }),
  });

  return {
    items: data?.items ?? [],
    pagination: data?.pagination,
    isLoading,
    isError,
  };
};
