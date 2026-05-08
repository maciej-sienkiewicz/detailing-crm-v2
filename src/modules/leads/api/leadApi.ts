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
    id: '1',
    source: 'PHONE' as LeadSource,
    status: 'IN_PROGRESS' as LeadStatus,
    contactIdentifier: '+48 123 456 789',
    customerName: 'Jan Kowalski',
    initialMessage: 'Zainteresowany polerowaniam całego auta, może też folia?',
    reasoning: 'Klient pyta o polerowanie i folię PPF — prawdopodobnie chce kompleksowej ochrony lakieru przed sprzedażą lub długoterminowego użytkowania. Wysoka wartość transakcji.',
    vehicleBrand: 'BMW',
    vehicleModel: 'M3 Competition',
    relatedVisits: [
      { id: '95ddeec4-4420-4153-9058-e3c95524ee6d', title: 'Detailing + PPF BMW 5 Series' },
      { id: 'b12c3d4e-5678-90ab-cdef-1234567890ab', title: 'Full PPF BMW M4' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedValue: 250000,
    requiresVerification: true,
  },
  {
    id: '2',
    source: 'EMAIL' as LeadSource,
    status: 'IN_PROGRESS' as LeadStatus,
    contactIdentifier: 'anna.nowak@example.com',
    customerName: 'Anna Nowak',
    initialMessage: 'Chciałabym zamówić powłokę ceramiczną na moje auto. Macie w ofercie korekta lakieru przed nałożeniem?',
    reasoning: 'Klientka zainteresowana pakietem ceramika + korekta. Świadoma procesu — wymagający klient premium. Duże prawdopodobieństwo konwersji.',
    vehicleBrand: 'Porsche',
    vehicleModel: 'Macan S',
    relatedVisits: [
      { id: 'c23d4e5f-6789-01bc-defa-234567890bcd', title: 'Powłoka ceramiczna Porsche 911' },
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    estimatedValue: 450000,
    requiresVerification: false,
  },
  {
    id: '3',
    source: 'MANUAL' as LeadSource,
    status: 'IN_PROGRESS' as LeadStatus,
    contactIdentifier: '+48 987 654 321',
    customerName: 'Piotr Wiśniewski',
    initialMessage: 'Folia PPF na maskę i błotniki przednie. Proszę o wycenę.',
    reasoning: 'Standardowe zapytanie o częściowe PPF. Klient wie czego chce — wystarczy wycena na konkretny zakres.',
    vehicleBrand: 'Audi',
    vehicleModel: 'RS6 Avant',
    relatedVisits: [],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    estimatedValue: 350000,
    requiresVerification: false,
  },
  {
    id: '4',
    source: 'PHONE' as LeadSource,
    status: 'CONVERTED' as LeadStatus,
    contactIdentifier: '+48 555 666 777',
    customerName: 'Maria Dąbrowska',
    initialMessage: 'Detailing kompletny przed sprzedażą auta, chcę żeby wyglądało jak nowe.',
    reasoning: 'Przygotowanie do sprzedaży — klientka szuka kompleksowego odświeżenia. Priorytet: wygląd i zapach wnętrza.',
    vehicleBrand: 'Volkswagen',
    vehicleModel: 'Tiguan',
    relatedVisits: [
      { id: 'd34e5f60-7890-12cd-efab-345678901cde', title: 'Detailing pre-sale VW Tiguan' },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    estimatedValue: 180000,
    requiresVerification: false,
  },
  {
    id: '5',
    source: 'EMAIL' as LeadSource,
    status: 'ABANDONED' as LeadStatus,
    contactIdentifier: 'tomasz.lewandowski@business.pl',
    customerName: 'Tomasz Lewandowski',
    initialMessage: 'Proszę o wycenę flotową dla 10 samochodów firmowych — corocznie.',
    reasoning: 'Zapytanie flotowe B2B z potencjałem cyklicznym. Wymaga dedykowanej oferty i negocjacji cenowych.',
    vehicleBrand: undefined,
    vehicleModel: undefined,
    relatedVisits: [],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    estimatedValue: 1500000,
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

const mockGetPipelineSummary = async (_sourceFilter?: LeadSource[]): Promise<LeadPipelineSummary> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        awaitingFirstContactCount: 5,
        avgWaitingTimeMinutes: 135,
        conversionRateThisMonth: 42.5,
        conversionRateTrendPp: 8.3,
        convertedValueThisMonth: 18400,
        convertedCountThisMonth: 7,
        atRiskValue: 12400,
        atRiskCount: 3,
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

const mockEstimations: Record<string, LeadEstimation> = {
  '1': {
    id: 'est-1',
    status: 'COMPLETED',
    extractedNeeds: ['Full Body PPF', 'Detailing wnętrza', 'Mycie felg'],
    matchedItems: [
      {
        serviceId: 'svc-ppf',
        serviceName: 'Full Body PPF',
        priceNet: 668293,
        vatRate: 23,
        priceGross: 822000,
      },
      {
        serviceId: 'svc-interior',
        serviceName: 'Detailing wnętrza',
        priceNet: 56911,
        vatRate: 23,
        priceGross: 70000,
      },
    ],
    unmatchedNeeds: ['Mycie felg'],
    totalNet: 725204,
    totalGross: 892000,
    relatedVisits: [
      { id: '95ddeec4-4420-4153-9058-e3c95524ee6d', title: 'Detailing + PPF BMW 5 Series' },
      { id: 'b12c3d4e-5678-90ab-cdef-1234567890ab', title: 'Full PPF BMW M4' },
    ],
    aiReasoning: 'Na podstawie podobnych realizacji dla BMW wyceniono pełne PPF oraz detailing wnętrza. Mycie felg nie jest w cenniku — do wyceny indywidualnej.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  '2': {
    id: 'est-2',
    status: 'COMPLETED',
    extractedNeeds: ['Powłoka ceramiczna', 'Korekta lakieru'],
    matchedItems: [
      {
        serviceId: 'svc-ceramic',
        serviceName: 'Powłoka ceramiczna',
        priceNet: 284553,
        vatRate: 23,
        priceGross: 350000,
      },
      {
        serviceId: 'svc-correction',
        serviceName: 'Korekta lakieru (1-etapowa)',
        priceNet: 81301,
        vatRate: 23,
        priceGross: 100000,
      },
    ],
    unmatchedNeeds: [],
    totalNet: 365854,
    totalGross: 450000,
    relatedVisits: [
      { id: 'c23d4e5f-6789-01bc-defa-234567890bcd', title: 'Powłoka ceramiczna Porsche 911' },
    ],
    aiReasoning: 'Klientka wskazała jasno na ceramikę + korektę. Wycena bazuje na standardowym pakiecie dla SUV premium. Wszystkie pozycje dopasowane z cennika.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
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
};
