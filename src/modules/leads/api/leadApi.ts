// src/modules/leads/api/leadApi.ts
import { apiClient } from '@/core';
import type {
  Lead,
  LeadId,
  LeadListFilters,
  LeadListResponse,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadPipelineSummary,
  LeadStatus,
  LeadSource,
} from '../types';

const USE_MOCKS = true;
const BASE_PATH = '/v1/leads';

// Mock data for development
const mockLeads: Lead[] = [
  {
    id: '1',
    source: 'PHONE' as LeadSource,
    status: 'IN_PROGRESS' as LeadStatus,
    contactIdentifier: '+48 123 456 789',
    customerName: 'Jan Kowalski',
    initialMessage: 'Zainteresowany polerowaniam całego auta',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedValue: 250000, // 2500.00 PLN
    requiresVerification: true,
  },
  {
    id: '2',
    source: 'EMAIL' as LeadSource,
    status: 'IN_PROGRESS' as LeadStatus,
    contactIdentifier: 'anna.nowak@example.com',
    customerName: 'Anna Nowak',
    initialMessage: 'Chciałabym zamówić powłokę ceramiczną',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    estimatedValue: 450000, // 4500.00 PLN
    requiresVerification: false,
  },
  {
    id: '3',
    source: 'MANUAL' as LeadSource,
    status: 'IN_PROGRESS' as LeadStatus,
    contactIdentifier: '+48 987 654 321',
    customerName: 'Piotr Wiśniewski',
    initialMessage: 'Folia PPF na maskę i błotniki',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    estimatedValue: 350000, // 3500.00 PLN
    requiresVerification: false,
  },
  {
    id: '4',
    source: 'PHONE' as LeadSource,
    status: 'CONVERTED' as LeadStatus,
    contactIdentifier: '+48 555 666 777',
    customerName: 'Maria Dąbrowska',
    initialMessage: 'Detailing kompletny przed sprzedażą auta',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    estimatedValue: 180000, // 1800.00 PLN
    requiresVerification: false,
  },
  {
    id: '5',
    source: 'EMAIL' as LeadSource,
    status: 'ABANDONED' as LeadStatus,
    contactIdentifier: 'tomasz.lewandowski@business.pl',
    customerName: 'Tomasz Lewandowski',
    initialMessage: 'Wycena flotowa dla 10 samochodów',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    estimatedValue: 1500000, // 15000.00 PLN
    requiresVerification: false,
  },
];

let mockLeadsStore = [...mockLeads];
let mockIdCounter = 6;

const mockGetLeads = async (filters: LeadListFilters): Promise<LeadListResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let filteredLeads = [...mockLeadsStore];

      // Filter by status
      if (filters.status && filters.status.length > 0) {
        filteredLeads = filteredLeads.filter((l) => filters.status!.includes(l.status));
      }

      // Filter by source
      if (filters.source && filters.source.length > 0) {
        filteredLeads = filteredLeads.filter((l) => filters.source!.includes(l.source));
      }

      // Search by contact or customer name
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredLeads = filteredLeads.filter(
          (l) =>
            l.contactIdentifier.toLowerCase().includes(searchLower) ||
            l.customerName?.toLowerCase().includes(searchLower) ||
            l.initialMessage?.toLowerCase().includes(searchLower)
        );
      }

      // Sort: requiresVerification first, then by createdAt descending
      filteredLeads.sort((a, b) => {
        // Pin requiresVerification: true to top
        if (a.requiresVerification !== b.requiresVerification) {
          return a.requiresVerification ? -1 : 1;
        }
        // Then sort by createdAt descending
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // Custom sort if specified
      if (filters.sortBy && filters.sortBy !== 'createdAt') {
        filteredLeads.sort((a, b) => {
          const aVal = a[filters.sortBy!];
          const bVal = b[filters.sortBy!];
          if (aVal === undefined || bVal === undefined) return 0;
          const direction = filters.sortDirection === 'asc' ? 1 : -1;
          return aVal > bVal ? direction : -direction;
        });
      }

      const start = (filters.page - 1) * filters.limit;
      const end = start + filters.limit;
      const paginatedLeads = filteredLeads.slice(start, end);

      resolve({
        leads: paginatedLeads,
        pagination: {
          currentPage: filters.page,
          totalPages: Math.ceil(filteredLeads.length / filters.limit),
          totalItems: filteredLeads.length,
          itemsPerPage: filters.limit,
        },
      });
    }, 300);
  });
};

const mockCreateLead = async (data: CreateLeadRequest): Promise<Lead> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newLead: Lead = {
        id: String(mockIdCounter++),
        source: data.source,
        status: 'IN_PROGRESS' as LeadStatus,
        contactIdentifier: data.contactIdentifier,
        customerName: data.customerName,
        initialMessage: data.initialMessage,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estimatedValue: data.estimatedValue,
        requiresVerification: false, // Manual entries don't require verification
      };
      mockLeadsStore.unshift(newLead);
      resolve(newLead);
    }, 500);
  });
};

const mockUpdateLead = async (data: UpdateLeadRequest): Promise<Lead> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockLeadsStore.findIndex((l) => l.id === data.id);
      if (index === -1) {
        reject(new Error('Lead not found'));
        return;
      }

      const existingLead = mockLeadsStore[index];
      const updatedLead: Lead = {
        ...existingLead,
        ...(data.status !== undefined && { status: data.status }),
        ...(data.customerName !== undefined && { customerName: data.customerName }),
        ...(data.initialMessage !== undefined && { initialMessage: data.initialMessage }),
        ...(data.estimatedValue !== undefined && { estimatedValue: data.estimatedValue }),
        updatedAt: new Date().toISOString(),
        // Clear verification flag when status changes to IN_PROGRESS
        requiresVerification:
          data.status === ('IN_PROGRESS' as LeadStatus)
            ? false
            : existingLead.requiresVerification,
      };

      mockLeadsStore[index] = updatedLead;
      resolve(updatedLead);
    }, 300);
  });
};

const mockGetPipelineSummary = async (sourceFilter?: LeadSource[]): Promise<LeadPipelineSummary> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Filter by source if provided
      let filteredLeads = mockLeadsStore;
      if (sourceFilter && sourceFilter.length > 0) {
        filteredLeads = mockLeadsStore.filter((l) => sourceFilter.includes(l.source));
      }

      const inProgress = filteredLeads.filter((l) => l.status === ('IN_PROGRESS' as LeadStatus));
      const converted = filteredLeads.filter((l) => l.status === ('CONVERTED' as LeadStatus));
      const abandoned = filteredLeads.filter((l) => l.status === ('ABANDONED' as LeadStatus));

      const totalPipelineValue = inProgress.reduce(
        (sum, lead) => sum + lead.estimatedValue,
        0
      );

      // Calculate this month's value
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const leadsThisMonth = filteredLeads.filter(
        (l) => new Date(l.createdAt) >= startOfMonth
      );
      const leadsValueThisMonth = leadsThisMonth.reduce(
        (sum, lead) => sum + lead.estimatedValue,
        0
      );

      // Calculate converted value this month (by conversion/updatedAt date)
      const convertedThisMonth = converted.filter((l) => {
        const updatedAt = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
        return updatedAt >= startOfMonth;
      });
      const convertedValueThisMonth = convertedThisMonth.reduce(
        (sum, lead) => sum + lead.estimatedValue,
        0
      );

      // Calculate this week's conversions (by updatedAt date - conversion date)
      const startOfThisWeek = new Date(now);
      startOfThisWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
      startOfThisWeek.setHours(0, 0, 0, 0);

      const startOfPreviousWeek = new Date(startOfThisWeek);
      startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);

      const convertedThisWeek = converted.filter((l) => {
        const updatedAt = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
        return updatedAt >= startOfThisWeek;
      });

      const convertedPreviousWeek = converted.filter((l) => {
        const updatedAt = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
        return updatedAt >= startOfPreviousWeek && updatedAt < startOfThisWeek;
      });

      const convertedThisWeekCount = convertedThisWeek.length;
      const convertedThisWeekValue = convertedThisWeek.reduce(
        (sum, lead) => sum + lead.estimatedValue,
        0
      );

      const convertedPreviousWeekCount = convertedPreviousWeek.length;
      const convertedPreviousWeekValue = convertedPreviousWeek.reduce(
        (sum, lead) => sum + lead.estimatedValue,
        0
      );

      resolve({
        totalPipelineValue,
        inProgressCount: inProgress.length,
        convertedCount: converted.length,
        abandonedCount: abandoned.length,
        convertedThisWeekCount,
        convertedThisWeekValue,
        convertedPreviousWeekCount,
        convertedPreviousWeekValue,
        leadsValueThisMonth,
        convertedValueThisMonth,
      });
    }, 200);
  });
};

const mockDeleteLead = async (id: LeadId): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockLeadsStore.findIndex((l) => l.id === id);
      if (index === -1) {
        reject(new Error('Lead not found'));
        return;
      }
      mockLeadsStore.splice(index, 1);
      resolve();
    }, 300);
  });
};

// For WebSocket integration - adds lead to mock store
export const addLeadToMockStore = (lead: Lead): void => {
  mockLeadsStore.unshift(lead);
};

export const leadApi = {
  /**
   * Get paginated list of leads with optional filters
   */
  getLeads: async (filters: LeadListFilters): Promise<LeadListResponse> => {
    if (USE_MOCKS) {
      return mockGetLeads(filters);
    }

    const params = new URLSearchParams({
      page: String(filters.page),
      limit: String(filters.limit),
    });

    if (filters.search) params.append('search', filters.search);
    if (filters.status?.length) params.append('status', filters.status.join(','));
    if (filters.source?.length) params.append('source', filters.source.join(','));
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);

    const response = await apiClient.get(`${BASE_PATH}?${params}`);
    return response.data;
  },

  /**
   * Get a single lead by ID
   */
  getLead: async (id: LeadId): Promise<Lead> => {
    if (USE_MOCKS) {
      const lead = mockLeadsStore.find((l) => l.id === id);
      if (!lead) throw new Error('Lead not found');
      return Promise.resolve(lead);
    }

    const response = await apiClient.get(`${BASE_PATH}/${id}`);
    return response.data;
  },

  /**
   * Create a new lead (manual entry)
   */
  createLead: async (data: CreateLeadRequest): Promise<Lead> => {
    if (USE_MOCKS) {
      return mockCreateLead(data);
    }

    const response = await apiClient.post(BASE_PATH, data);
    return response.data;
  },

  /**
   * Update an existing lead
   */
  updateLead: async (data: UpdateLeadRequest): Promise<Lead> => {
    if (USE_MOCKS) {
      return mockUpdateLead(data);
    }

    const response = await apiClient.patch(`${BASE_PATH}/${data.id}`, data);
    return response.data;
  },

  /**
   * Delete a lead
   */
  deleteLead: async (id: LeadId): Promise<void> => {
    if (USE_MOCKS) {
      return mockDeleteLead(id);
    }

    await apiClient.delete(`${BASE_PATH}/${id}`);
  },

  /**
   * Get pipeline summary for dashboard widget
   * @param sourceFilter - Optional array of sources to filter by
   */
  getPipelineSummary: async (sourceFilter?: LeadSource[]): Promise<LeadPipelineSummary> => {
    if (USE_MOCKS) {
      return mockGetPipelineSummary(sourceFilter);
    }

    const params = new URLSearchParams();
    if (sourceFilter?.length) {
      params.append('source', sourceFilter.join(','));
    }

    const queryString = params.toString();
    const url = queryString ? `${BASE_PATH}/pipeline-summary?${queryString}` : `${BASE_PATH}/pipeline-summary`;
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Quick status update for a lead
   */
  updateLeadStatus: async (id: LeadId, status: LeadStatus): Promise<Lead> => {
    if (USE_MOCKS) {
      return mockUpdateLead({ id, status });
    }

    const response = await apiClient.patch(`${BASE_PATH}/${id}/status`, { status });
    return response.data;
  },

  /**
   * Quick estimated value update for a lead
   */
  updateLeadValue: async (id: LeadId, estimatedValue: number): Promise<Lead> => {
    if (USE_MOCKS) {
      return mockUpdateLead({ id, estimatedValue });
    }

    const response = await apiClient.patch(`${BASE_PATH}/${id}/value`, { estimatedValue });
    return response.data;
  },
};
