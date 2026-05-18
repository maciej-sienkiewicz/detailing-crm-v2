// src/modules/leads/hooks/useLeads.ts
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { leadApi } from '../api/leadApi';
import { buildAppointmentPayload } from '@/modules/appointments/utils/buildAppointmentPayload';
import type {
  Lead,
  LeadDetail,
  LeadUserQuote,
  CustomerSnapshot,
  LeadId,
  LeadListFilters,
  LeadListResponse,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadPipelineSummary,
  LeadStatus,
  LeadSource,
  SaveUserQuoteRequest,
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
 * Hook for fetching a single lead detail by ID (includes AI estimation)
 */
export const useLead = (id: LeadId | undefined) => {
  const queryKey = [...LEADS_KEY, 'detail', id];

  const { data, isLoading, isError, error, refetch } = useQuery<LeadDetail>({
    queryKey,
    queryFn: () => leadApi.getLead(id!),
    enabled: !!id,
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
 * Returns the count of leads in NEW status.
 * Subscribes to LEAD_PIPELINE_KEY — deduplicates with useLeadPipelineSummary,
 * and is automatically invalidated by useLeadSocket on incoming WebSocket events.
 */
export const useNewLeadsCount = (): number => {
  const { data } = useQuery<LeadPipelineSummary, Error, number>({
    queryKey: LEAD_PIPELINE_KEY,
    queryFn: () => leadApi.getPipelineSummary(),
    select: (summary) => summary.newLeadsCount,
  });
  return data ?? 0;
};

/**
 * Hook for fetching pipeline summary
 * @param sourceFilter - Optional array of sources to filter by
 * @param dateFrom - Optional start date (YYYY-MM-DD)
 * @param dateTo - Optional end date (YYYY-MM-DD)
 */
export const useLeadPipelineSummary = (sourceFilter?: LeadSource[], dateFrom?: string, dateTo?: string) => {
  const hasFilter = (sourceFilter?.length ?? 0) > 0 || !!dateFrom || !!dateTo;
  const queryKey = hasFilter
    ? [...LEAD_PIPELINE_KEY, { source: sourceFilter, dateFrom, dateTo }]
    : LEAD_PIPELINE_KEY;

  const { data, isLoading, isError, error, refetch } = useQuery<LeadPipelineSummary>({
    queryKey,
    queryFn: () => leadApi.getPipelineSummary(sourceFilter, dateFrom, dateTo),
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

/**
 * Hook for assigning / changing / unassigning a customer to a lead
 */
export const useAssignLeadCustomer = (leadId: LeadId) => {
  const queryClient = useQueryClient();

  return useMutation<CustomerSnapshot | null, Error, string | null>({
    mutationFn: (customerId) => leadApi.assignCustomer(leadId, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'detail', leadId] });
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'list'] });
    },
  });
};

/**
 * Hook for creating or replacing the user-defined quote for a lead
 */
export const useSaveUserQuote = (leadId: LeadId) => {
  const queryClient = useQueryClient();

  return useMutation<LeadUserQuote, Error, SaveUserQuoteRequest>({
    mutationFn: (data) => leadApi.saveUserQuote(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'detail', leadId] });
    },
  });
};

/**
 * Hook for deleting the user-defined quote for a lead
 */
export const useDeleteUserQuote = (leadId: LeadId) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => leadApi.deleteUserQuote(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'detail', leadId] });
    },
  });
};

/**
 * Builds and submits an appointment creation payload to the lead-specific endpoint.
 * On success the lead transitions to CONFIRMED status (handled by the backend).
 */
export const useLeadAppointmentCreation = (leadId: LeadId | null) => {
  const queryClient = useQueryClient();

  return useMutation<Lead, Error, import('@/modules/calendar/components/QuickEventModal').QuickEventFormData>({
    mutationFn: async (data) => {
      if (!leadId) throw new Error('Brak ID leada');
      const payload = await buildAppointmentPayload(data);
      return leadApi.createLeadAppointment(leadId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
    },
  });
};
