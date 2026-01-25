// src/modules/leads/hooks/useLeads.ts
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { leadApi } from '../api/leadApi';
import type {
  Lead,
  LeadId,
  LeadListFilters,
  LeadListResponse,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadPipelineSummary,
  LeadStatus,
} from '../types';

// Query keys
export const LEADS_KEY = ['leads'];
export const LEAD_PIPELINE_KEY = ['leads', 'pipeline'];

// Type for mutation context
type MutationContext = {
  previousData: [QueryKey, LeadListResponse | undefined][];
};

/**
 * Hook for fetching paginated leads list
 */
export const useLeads = (filters: LeadListFilters) => {
  const queryKey = [...LEADS_KEY, 'list', filters];

  const { data, isLoading, isError, error, refetch } = useQuery<LeadListResponse>({
    queryKey,
    queryFn: () => leadApi.getLeads(filters),
    staleTime: 30_000, // 30 seconds
  });

  return {
    leads: data?.leads || [],
    pagination: data?.pagination,
    isLoading,
    isError,
    error,
    refetch,
  };
};

/**
 * Hook for fetching a single lead by ID
 */
export const useLead = (id: LeadId | undefined) => {
  const queryKey = [...LEADS_KEY, 'detail', id];

  const { data, isLoading, isError, error, refetch } = useQuery<Lead>({
    queryKey,
    queryFn: () => leadApi.getLead(id!),
    enabled: !!id,
    staleTime: 60_000, // 1 minute
  });

  return {
    lead: data,
    isLoading,
    isError,
    error,
    refetch,
  };
};

/**
 * Hook for fetching pipeline summary
 */
export const useLeadPipelineSummary = () => {
  const { data, isLoading, isError, error, refetch } = useQuery<LeadPipelineSummary>({
    queryKey: LEAD_PIPELINE_KEY,
    queryFn: () => leadApi.getPipelineSummary(),
    staleTime: 30_000, // 30 seconds
  });

  return {
    summary: data,
    isLoading,
    isError,
    error,
    refetch,
  };
};

/**
 * Hook for creating a new lead
 */
export const useCreateLead = () => {
  const queryClient = useQueryClient();

  return useMutation<Lead, Error, CreateLeadRequest>({
    mutationFn: (data) => leadApi.createLead(data),
    onSuccess: () => {
      // Invalidate leads list to refetch
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: LEAD_PIPELINE_KEY });
    },
  });
};

/**
 * Hook for updating a lead
 */
export const useUpdateLead = () => {
  const queryClient = useQueryClient();

  return useMutation<Lead, Error, UpdateLeadRequest, MutationContext>({
    mutationFn: (data) => leadApi.updateLead(data),
    onMutate: async (newData): Promise<MutationContext> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: LEADS_KEY });

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueriesData<LeadListResponse>({ queryKey: LEADS_KEY });

      // Optimistically update all cached lead lists
      queryClient.setQueriesData<LeadListResponse>(
        { queryKey: [...LEADS_KEY, 'list'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            leads: old.leads.map((lead) =>
              lead.id === newData.id
                ? {
                    ...lead,
                    ...newData,
                    updatedAt: new Date().toISOString(),
                    // Clear verification flag when status changes to IN_PROGRESS
                    requiresVerification:
                      newData.status === 'IN_PROGRESS' ? false : lead.requiresVerification,
                  }
                : lead
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: LEAD_PIPELINE_KEY });
    },
  });
};

/**
 * Hook for quick status update (optimistic)
 */
export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<Lead, Error, { id: LeadId; status: LeadStatus }, MutationContext>({
    mutationFn: ({ id, status }) => leadApi.updateLeadStatus(id, status),
    onMutate: async ({ id, status }): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: LEADS_KEY });

      const previousData = queryClient.getQueriesData<LeadListResponse>({ queryKey: LEADS_KEY });

      // Optimistic update
      queryClient.setQueriesData<LeadListResponse>(
        { queryKey: [...LEADS_KEY, 'list'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            leads: old.leads.map((lead) =>
              lead.id === id
                ? {
                    ...lead,
                    status,
                    updatedAt: new Date().toISOString(),
                    requiresVerification: status === 'IN_PROGRESS' ? false : lead.requiresVerification,
                  }
                : lead
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: LEAD_PIPELINE_KEY });
    },
  });
};

/**
 * Hook for quick value update (optimistic)
 */
export const useUpdateLeadValue = () => {
  const queryClient = useQueryClient();

  return useMutation<Lead, Error, { id: LeadId; estimatedValue: number }, MutationContext>({
    mutationFn: ({ id, estimatedValue }) => leadApi.updateLeadValue(id, estimatedValue),
    onMutate: async ({ id, estimatedValue }): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: LEADS_KEY });

      const previousData = queryClient.getQueriesData<LeadListResponse>({ queryKey: LEADS_KEY });

      // Optimistic update
      queryClient.setQueriesData<LeadListResponse>(
        { queryKey: [...LEADS_KEY, 'list'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            leads: old.leads.map((lead) =>
              lead.id === id
                ? {
                    ...lead,
                    estimatedValue,
                    updatedAt: new Date().toISOString(),
                  }
                : lead
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: LEAD_PIPELINE_KEY });
    },
  });
};

/**
 * Hook for deleting a lead
 */
export const useDeleteLead = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, LeadId>({
    mutationFn: (id) => leadApi.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: LEAD_PIPELINE_KEY });
    },
  });
};
