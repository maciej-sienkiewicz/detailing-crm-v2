// src/modules/leads/api/leadApi.ts
import { apiClient } from '@/core';
import type {
  Lead,
  LeadDetail,
  LeadEstimation,
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

const USE_MOCKS = false;
const BASE_PATH = '/v1/leads';

// Mock data for development
const mockLeads: Lead[] = [
  {
    id: '7e08f541-2275-45e5-ad29-9489d993ba67',
    source: 'EMAIL' as LeadSource,
    status: 'NEW' as LeadStatus,
    contactIdentifier: 'sienkiewicz.maciej971030@gmail.com',
    customerName: 'Maciej Sienkiewicz',
    initialMessage: '>\n>\n> Cześć, powiedźcie mi proszę ile by kosztowało oklejenie mojego nissanika\n> nv200 folią PPF? zastanawiam się też nad pełnym odświeżeniem wnętrza,\n> strasznie Zuzia nabąkała w środku i wypadałoby ogarnąć\n>\n>',
    summary: 'Klient pyta o oklejenie pojazdu folią PPF oraz pełne odświeżenie wnętrza swojego Nissana NV200.',
    vehicleBrand: 'Nissan',
    vehicleModel: 'NV200',
    relatedVisits: [
      { id: '566872ca-8db2-45be-a769-c2f1eaa3449a', title: null },
      { id: '61c11352-1b06-48fa-96e2-33ffee44873e', title: 'Sienkiewicz na full body' },
      { id: 'c5200a4a-8e2a-4ac7-b509-f46b9368739e', title: 'Folia + detailing' },
    ],
    createdAt: '2026-05-12T13:58:20.410337Z',
    updatedAt: '2026-05-12T13:58:26.345383Z',
    estimatedValue: 1060260,
    requiresVerification: false,
    assignedCustomer: null,
    appointmentId: null,
    visitId: null,
  },
  {
    id: '8983139c-3a26-4802-8cab-8709dd1d6db1',
    source: 'EMAIL' as LeadSource,
    status: 'NEW' as LeadStatus,
    contactIdentifier: 'sienkiewicz.maciej971030@gmail.com',
    customerName: 'Maciej Sienkiewicz',
    initialMessage: 'Cze=C5=9B=C4=87, powied=C5=BAcie mi prosz=C4=99 ile by kosztowa=C5=82o okle=\r\njenie mojego nissanika\r\nnv200 foli=C4=85 PPF? zastanawiam si=C4=99 te=C5=BC nad pe=C5=82nym od=C5=\r\n=9Bwie=C5=BCeniem wn=C4=99trza,\r\nstrasznie Zuzia nab=C4=85ka=C5=82a w =C5=9Brodku i wypada=C5=82oby ogarn=C4=\r\n=85=C4=87\r\n\r\npozdro 600',
    summary: 'Klient pyta o oklejenie pojazdu folią PPF oraz pełne odświeżenie wnętrza w Nissanie NV200.',
    vehicleBrand: 'Nissan',
    vehicleModel: 'NV200',
    relatedVisits: [
      { id: '566872ca-8db2-45be-a769-c2f1eaa3449a', title: null },
      { id: '61c11352-1b06-48fa-96e2-33ffee44873e', title: 'Sienkiewicz na full body' },
      { id: 'c5200a4a-8e2a-4ac7-b509-f46b9368739e', title: 'Folia + detailing' },
    ],
    createdAt: '2026-05-12T11:53:01.889146Z',
    updatedAt: '2026-05-12T11:53:08.475669Z',
    estimatedValue: 1060260,
    requiresVerification: false,
    assignedCustomer: null,
    appointmentId: null,
    visitId: null,
  },
  {
    id: 'ffd18565-a2d4-4d5d-8255-c6316571f156',
    source: 'EMAIL' as LeadSource,
    status: 'NEW' as LeadStatus,
    contactIdentifier: 'sienkiewicz.maciej971030@gmail.com',
    customerName: 'Maciej Sienkiewicz',
    initialMessage: 'Cześć, powiedźcie mi proszę ile by kosztowało oklejenie mojego nissanika\nnv200 folią PPF? zastanawiam się też nad pełnym odświeżeniem wnętrza,\nstrasznie Zuzia nabąkała w środku i wypadałoby ogarnąć\n\n\nwt., 12 maj 2026 o 15:03 Maciej Sienkiewicz <\nsienkiewicz.maciej971030@gmail.com> napisał(a):\n\n> Cześć, powiedźcie mi proszę ile by kosztowało oklejenie mojego nissanika\n> nv200 folią PPF? zastanawiam się też nad pełnym odświeżeniem wnętrza,\n> strasznie Zuzia nabąkała w środku i wypadałoby ogarnąć\n>\n>',
    summary: 'Klient pyta o oklejenie pojazdu folią PPF oraz pełne odświeżenie wnętrza swojego Nissana NV200.',
    vehicleBrand: 'Nissan',
    vehicleModel: 'NV200',
    relatedVisits: [
      { id: '566872ca-8db2-45be-a769-c2f1eaa3449a', title: null },
      { id: '61c11352-1b06-48fa-96e2-33ffee44873e', title: 'Sienkiewicz na full body' },
      { id: 'c5200a4a-8e2a-4ac7-b509-f46b9368739e', title: 'Folia + detailing' },
    ],
    createdAt: '2026-05-12T13:14:01.682869Z',
    updatedAt: '2026-05-12T13:14:06.507445Z',
    estimatedValue: 1060260,
    requiresVerification: false,
    assignedCustomer: null,
    appointmentId: null,
    visitId: null,
  },
  {
    id: 'bcc99f82-c57e-463e-a96c-20a09d2b0459',
    source: 'EMAIL' as LeadSource,
    status: 'NEW' as LeadStatus,
    contactIdentifier: 'sienkiewicz.maciej971030@gmail.com',
    customerName: 'Maciej Sienkiewicz',
    initialMessage: 'Cześć, powiedźcie mi proszę ile by kosztowało oklejenie mojego nissanika\nnv200 folią PPF? zastanawiam się też nad pełnym odświeżeniem wnętrza,\nstrasznie Zuzia nabąkała w środku i wypadałoby ogarnąć',
    summary: 'Klient pyta o oklejenie folią PPF oraz pełne odświeżenie wnętrza w Nissan NV200.',
    vehicleBrand: 'Nissan',
    vehicleModel: 'NV200',
    relatedVisits: [
      { id: '566872ca-8db2-45be-a769-c2f1eaa3449a', title: null },
      { id: '61c11352-1b06-48fa-96e2-33ffee44873e', title: 'Sienkiewicz na full body' },
      { id: 'c5200a4a-8e2a-4ac7-b509-f46b9368739e', title: 'Folia + detailing' },
    ],
    createdAt: '2026-05-12T13:33:21.079768Z',
    updatedAt: '2026-05-12T13:33:25.729416Z',
    estimatedValue: 1060260,
    requiresVerification: false,
    assignedCustomer: null,
    appointmentId: null,
    visitId: null,
  },
  {
    id: 'b15e4ade-4a35-4920-be39-4ab3ac403bb6',
    source: 'EMAIL' as LeadSource,
    status: 'NEW' as LeadStatus,
    contactIdentifier: 'sienkiewicz.maciej971030@gmail.com',
    customerName: 'Maciej Sienkiewicz',
    initialMessage: 'Cześć, powiedźcie mi proszę ile by kosztowało oklejenie mojego nissanika\nnv200 folią PPF? zastanawiam się też nad pełnym odświeżeniem wnętrza,\nstrasznie Zuzia nabąkała w środku i wypadałoby ogarnąć',
    summary: 'Klient pyta o oklejenie folią PPF oraz pełne odświeżenie wnętrza w swoim Nissanie NV200.',
    vehicleBrand: 'Nissan',
    vehicleModel: 'NV200',
    relatedVisits: [
      { id: '566872ca-8db2-45be-a769-c2f1eaa3449a', title: null },
      { id: '61c11352-1b06-48fa-96e2-33ffee44873e', title: 'Sienkiewicz na full body' },
      { id: 'c5200a4a-8e2a-4ac7-b509-f46b9368739e', title: 'Folia + detailing' },
    ],
    createdAt: '2026-05-12T13:38:20.051060Z',
    updatedAt: '2026-05-12T13:38:25.580486Z',
    estimatedValue: 1060260,
    requiresVerification: false,
    assignedCustomer: null,
    appointmentId: null,
    visitId: null,
  },
  {
    id: 'ef29cf7c-7101-40b5-bf4e-0a285280ac81',
    source: 'EMAIL' as LeadSource,
    status: 'NEW' as LeadStatus,
    contactIdentifier: 'sienkiewicz.maciej971030@gmail.com',
    customerName: 'Maciej Sienkiewicz',
    initialMessage: 'Cześć, powiedźcie mi proszę ile by kosztowało oklejenie mojego nissanika\nnv200 folią PPF? zastanawiam się też nad pełnym odświeżeniem wnętrza,\nstrasznie Zuzia nabąkała w środku i wypadałoby ogarnąć\n\n\nwt., 12 maj 2026 o 14:54 Maciej Sienkiewicz <\nsienkiewicz.maciej971030@gmail.com> napisał(a):\n\n>\n>> Cześć, powiedźcie mi proszę ile by kosztowało oklejenie mojego nissanika\n>> nv200 folią PPF? zastanawiam się też nad pełnym odświeżeniem wnętrza,\n>> strasznie Zuzia nabąkała w środku i wypadałoby ogarnąć\n>>\n>>',
    summary: 'Klient pyta o oklejenie folią PPF oraz pełne odświeżenie wnętrza w swoim Nissanie NV200.',
    vehicleBrand: 'Nissan',
    vehicleModel: 'NV200',
    relatedVisits: [
      { id: '566872ca-8db2-45be-a769-c2f1eaa3449a', title: null },
      { id: '61c11352-1b06-48fa-96e2-33ffee44873e', title: 'Sienkiewicz na full body' },
      { id: 'c5200a4a-8e2a-4ac7-b509-f46b9368739e', title: 'Folia + detailing' },
    ],
    createdAt: '2026-05-12T14:03:24.262877Z',
    updatedAt: '2026-05-12T14:03:29.552527Z',
    estimatedValue: 1060260,
    requiresVerification: false,
    assignedCustomer: null,
    appointmentId: null,
    visitId: null,
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
        status: 'NEW' as LeadStatus,
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
          (data.status === ('IN_PROGRESS' as LeadStatus) || data.status === ('NEW' as LeadStatus))
            ? false
            : existingLead.requiresVerification,
      };

      mockLeadsStore[index] = updatedLead;
      resolve(updatedLead);
    }, 300);
  });
};

const mockGetPipelineSummary = async (_sourceFilter?: LeadSource[]): Promise<LeadPipelineSummary> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        newLeadsCount: mockLeadsStore.filter(l => l.status === 'NEW').length,
        awaitingFirstContactCount: mockLeadsStore.filter(l => l.status === 'NEW').length,
        avgWaitingTimeMinutes: 72,
        conversionRateThisMonth: 0,
        conversionRateTrendPp: 0,
        convertedValueThisMonth: 0,
        convertedCountThisMonth: 0,
        atRiskValue: 6361560,
        atRiskCount: 6,
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

const sharedEstimation: LeadEstimation = {
  id: 'est-nissan',
  status: 'COMPLETED',
  extractedNeeds: ['Full Body PPF', 'Detailing wnętrza'],
  matchedItems: [
    {
      serviceId: 'svc-ppf',
      serviceName: 'Full Body PPF (Nissan NV200)',
      priceNet: 862000,
      vatRate: 23,
      priceGross: 1060260,
    },
    {
      serviceId: 'svc-interior',
      serviceName: 'Odświeżenie wnętrza',
      priceNet: 0,
      vatRate: 23,
      priceGross: 0,
    },
  ],
  unmatchedNeeds: [],
  totalNet: 862000,
  totalGross: 1060260,
  relatedVisits: [
    { id: '566872ca-8db2-45be-a769-c2f1eaa3449a', title: null },
    { id: '61c11352-1b06-48fa-96e2-33ffee44873e', title: 'Sienkiewicz na full body' },
    { id: 'c5200a4a-8e2a-4ac7-b509-f46b9368739e', title: 'Folia + detailing' },
  ],
  aiSummary: 'Klient pyta o Full Body PPF na Nissana NV200 oraz odświeżenie wnętrza. Wycena PPF bazuje na podobnych realizacjach dla pojazdów dostawczych. Odświeżenie wnętrza wymaga wyceny indywidualnej — brak standardowej pozycji w cenniku.',
  createdAt: '2026-05-12T13:58:26.345383Z',
  updatedAt: '2026-05-12T13:58:26.345383Z',
};

const mockEstimations: Record<string, LeadEstimation> = {
  '7e08f541-2275-45e5-ad29-9489d993ba67': sharedEstimation,
  '8983139c-3a26-4802-8cab-8709dd1d6db1': sharedEstimation,
  'ffd18565-a2d4-4d5d-8255-c6316571f156': sharedEstimation,
  'bcc99f82-c57e-463e-a96c-20a09d2b0459': sharedEstimation,
  'b15e4ade-4a35-4920-be39-4ab3ac403bb6': sharedEstimation,
  'ef29cf7c-7101-40b5-bf4e-0a285280ac81': sharedEstimation,
};

let mockUserQuotes: Record<string, LeadUserQuote> = {};
let mockAssignedCustomers: Record<string, CustomerSnapshot | null> = {};

const mockGetLeadDetail = async (id: LeadId): Promise<LeadDetail> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const lead = mockLeadsStore.find((l) => l.id === id);
      if (!lead) {
        reject(new Error('Lead not found'));
        return;
      }
      resolve({
        ...lead,
        assignedCustomer: mockAssignedCustomers[id] ?? null,
        estimation: mockEstimations[id] ?? null,
        userQuote: mockUserQuotes[id] ?? null,
      });
    }, 200);
  });
};

const mockAssignCustomer = async (leadId: LeadId, customerId: string | null): Promise<CustomerSnapshot | null> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const lead = mockLeadsStore.find((l) => l.id === leadId);
      if (!lead) { reject(new Error('Lead not found')); return; }
      if (customerId === null) {
        mockAssignedCustomers[leadId] = null;
        resolve(null);
      } else {
        const snapshot: CustomerSnapshot = { id: customerId, firstName: 'Jan', lastName: 'Przykładowy', email: null, phone: '+48 100 200 300' };
        mockAssignedCustomers[leadId] = snapshot;
        resolve(snapshot);
      }
    }, 200);
  });
};

let mockQuoteIdCounter = 1;

const mockSaveUserQuote = async (leadId: LeadId, data: SaveUserQuoteRequest): Promise<LeadUserQuote> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const items = data.items.map((item, idx) => ({
        id: `qi-${leadId}-${idx}`,
        serviceId: item.serviceId ?? null,
        serviceName: item.serviceName ?? '',
        priceNet: item.priceNet,
        vatRate: item.vatRate,
        priceGross: item.priceGross,
      }));
      const totalNet = items.reduce((s, i) => s + i.priceNet, 0);
      const totalGross = items.reduce((s, i) => s + i.priceGross, 0);
      const now = new Date().toISOString();
      const quote: LeadUserQuote = {
        id: `uq-${leadId}-${mockQuoteIdCounter++}`,
        items,
        totalNet,
        totalGross,
        createdAt: mockUserQuotes[leadId]?.createdAt ?? now,
        updatedAt: now,
      };
      mockUserQuotes[leadId] = quote;
      resolve(quote);
    }, 300);
  });
};

const mockDeleteUserQuote = async (leadId: LeadId): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      delete mockUserQuotes[leadId];
      resolve();
    }, 200);
  });
};

const mockCreateLeadAppointment = async (leadId: LeadId, _data: unknown): Promise<Lead> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockLeadsStore.findIndex((l) => l.id === leadId);
      if (index === -1) { reject(new Error('Lead not found')); return; }
      const updated: Lead = {
        ...mockLeadsStore[index],
        status: 'CONFIRMED' as LeadStatus,
        appointmentId: `mock-apt-${Date.now()}`,
        requiresVerification: false,
        updatedAt: new Date().toISOString(),
      };
      mockLeadsStore[index] = updated;
      resolve(updated);
    }, 400);
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
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const response = await apiClient.get(`${BASE_PATH}?${params}`);
    return response.data;
  },

  /**
   * Get a single lead by ID — includes AI estimation breakdown if available
   */
  getLead: async (id: LeadId): Promise<LeadDetail> => {
    if (USE_MOCKS) {
      return mockGetLeadDetail(id);
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
  getPipelineSummary: async (sourceFilter?: LeadSource[], dateFrom?: string, dateTo?: string): Promise<LeadPipelineSummary> => {
    if (USE_MOCKS) {
      return mockGetPipelineSummary(sourceFilter);
    }

    const params = new URLSearchParams();
    if (sourceFilter?.length) {
      params.append('source', sourceFilter.join(','));
    }
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

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

  /**
   * Assign, change, or unassign a customer to/from a lead.
   * Pass customerId to assign/change; pass null to unassign.
   */
  assignCustomer: async (leadId: LeadId, customerId: string | null): Promise<CustomerSnapshot | null> => {
    if (USE_MOCKS) {
      return mockAssignCustomer(leadId, customerId);
    }

    const response = await apiClient.patch(`${BASE_PATH}/${leadId}/customer`, { customerId });
    return response.data ?? null;
  },

  /**
   * Create or replace the user-defined quote for a lead.
   */
  saveUserQuote: async (leadId: LeadId, data: SaveUserQuoteRequest): Promise<LeadUserQuote> => {
    if (USE_MOCKS) {
      return mockSaveUserQuote(leadId, data);
    }

    const response = await apiClient.put(`${BASE_PATH}/${leadId}/user-quote`, data);
    return response.data;
  },

  /**
   * Delete the user-defined quote for a lead.
   */
  deleteUserQuote: async (leadId: LeadId): Promise<void> => {
    if (USE_MOCKS) {
      return mockDeleteUserQuote(leadId);
    }

    await apiClient.delete(`${BASE_PATH}/${leadId}/user-quote`);
  },

  /**
   * Create an appointment from a lead in a single transaction.
   * Changes lead status to CONFIRMED and sets appointmentId.
   */
  createLeadAppointment: async (leadId: LeadId, data: unknown): Promise<Lead> => {
    if (USE_MOCKS) {
      return mockCreateLeadAppointment(leadId, data);
    }

    const response = await apiClient.post(`${BASE_PATH}/${leadId}/appointment`, data);
    return response.data;
  },
};
