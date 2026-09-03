import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCommunicationRedirect,
  planRehearsal,
  runRehearsal,
  updateCommunicationRedirect,
} from '../api/redirectApi';

const KEY = ['communication-redirect'] as const;

export function useCommunicationRedirect() {
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: fetchCommunicationRedirect });
  return { settings: data ?? null, isLoading };
}

export function useUpdateCommunicationRedirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateCommunicationRedirect,
    onSuccess: updated => qc.setQueryData(KEY, updated),
  });
}

export function usePlanRehearsal() {
  return useMutation({ mutationFn: planRehearsal });
}

export function useRunRehearsal() {
  return useMutation({ mutationFn: runRehearsal });
}
