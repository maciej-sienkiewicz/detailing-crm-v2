// src/modules/leads/types.ts

/**
 * Unique identifier for a Lead
 */
export type LeadId = string;

/**
 * Source of the lead inquiry
 */
export enum LeadSource {
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  MANUAL = 'MANUAL',
}

/**
 * Lead lifecycle status
 */
export enum LeadStatus {
  NEW        = 'NEW',        // Just received, nobody has responded yet
  IN_PROGRESS = 'IN_PROGRESS', // Responded, waiting for client decision
  CONFIRMED  = 'CONFIRMED',  // Appointment created from this lead
  COMPLETED  = 'COMPLETED',  // Visit happened successfully
  LOST       = 'LOST',       // Contact lost / offer rejected
  NO_SHOW    = 'NO_SHOW',    // Appointment was planned but client didn't show
}

/**
 * Brief reference to a related visit (used in lead estimation context)
 */
export interface RelatedVisit {
  id: string;
  title: string | null;
}

/**
 * Lead entity representing an inquiry from various sources
 */
export interface Lead {
  id: LeadId;
  source: LeadSource;
  status: LeadStatus;

  /** Phone number or email address */
  contactIdentifier: string;

  /** Optional customer name */
  customerName?: string;

  /** Initial message or note from the inquiry */
  initialMessage?: string;

  /** System-generated reasoning / analysis summary for this lead */
  reasoning?: string;

  /** Vehicle brand extracted from the inquiry */
  vehicleBrand?: string;

  /** Vehicle model extracted from the inquiry */
  vehicleModel?: string;

  /** Visits that were used to build the estimation for this lead */
  relatedVisits: RelatedVisit[];

  /** ISO timestamp of when the lead was created */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt?: string;

  /** ID of appointment created from this lead (set when status → CONFIRMED) */
  appointmentId?: string | null;

  /**
   * Potential revenue in grosze (cents) for decimal precision
   * e.g., 250000 = 2500.00 PLN
   */
  estimatedValue: number;

  /**
   * Flag for records coming from WebSockets/Phone that need verification
   */
  requiresVerification: boolean;

  /** Customer from the database assigned to this lead */
  assignedCustomer?: CustomerSnapshot | null;
}

/**
 * Request payload for creating a new lead
 */
export interface CreateLeadRequest {
  source: LeadSource;
  contactIdentifier: string;
  customerName?: string;
  initialMessage?: string;
  /** Value in grosze */
  estimatedValue: number;
}

/**
 * Request payload for updating a lead
 */
export interface UpdateLeadRequest {
  id: LeadId;
  status?: LeadStatus;
  customerName?: string;
  initialMessage?: string;
  /** Value in grosze */
  estimatedValue?: number;
}

/**
 * Filters for listing leads
 */
export interface LeadListFilters {
  search?: string;
  status?: LeadStatus[];
  source?: LeadSource[];
  /** Start of date range, inclusive (YYYY-MM-DD, interpreted as 00:00 Europe/Warsaw) */
  dateFrom?: string;
  /** End of date range, inclusive (YYYY-MM-DD, exclusive boundary = next day 00:00) */
  dateTo?: string;
  page: number;
  limit: number;
  sortBy?: keyof Lead;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

/**
 * Response from lead list API
 */
export interface LeadListResponse {
  leads: Lead[];
  pagination: PaginationInfo;
}

/**
 * WebSocket event types for leads
 */
export enum LeadEventType {
  NEW_INBOUND_CALL = 'NEW_INBOUND_CALL',
  LEAD_UPDATED = 'LEAD_UPDATED',
  LEAD_STATUS_CHANGED = 'LEAD_STATUS_CHANGED',
}

/**
 * WebSocket event wrapper
 */
export interface LeadEvent<T = unknown> {
  type: LeadEventType;
  payload: T;
  timestamp: string;
}

/**
 * Payload for NEW_INBOUND_CALL event
 */
export interface InboundCallPayload {
  id: LeadId;
  phoneNumber: string;
  callerName?: string;
  receivedAt: string;
  estimatedValue: number;
}

/**
 * Pipeline summary returned by GET /api/v1/leads/pipeline-summary
 */
export interface LeadPipelineSummary {
  /** Leads currently in NEW status (used for sidebar badge) */
  newLeadsCount: number;
  /** Leads waiting for first contact (urgency metric) */
  awaitingFirstContactCount: number;
  /** Average waiting time for first contact in minutes */
  avgWaitingTimeMinutes: number;
  /** Conversion rate this month as a percentage (e.g. 42.5 = 42.5%) */
  conversionRateThisMonth: number;
  /** Trend in percentage points vs previous month (positive = improvement) */
  conversionRateTrendPp: number;
  /** Value of leads converted this month in PLN */
  convertedValueThisMonth: number;
  /** Number of leads converted this month */
  convertedCountThisMonth: number;
  /** Total value of at-risk leads (no contact 3+ days) in PLN */
  atRiskValue: number;
  /** Number of at-risk leads */
  atRiskCount: number;
}

/**
 * Form values for lead creation/editing
 */
export interface LeadFormValues {
  source: LeadSource;
  contactIdentifier: string;
  customerName: string;
  initialMessage: string;
  /** Display value in PLN (e.g., "2500.00") */
  estimatedValueDisplay: string;
}

// ---------------------------------------------------------------------------
// Customer snapshot (assigned to a lead)
// ---------------------------------------------------------------------------

export interface CustomerSnapshot {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

// ---------------------------------------------------------------------------
// AI Estimation types (returned from GET /api/v1/leads/{id})
// ---------------------------------------------------------------------------

export interface LeadEstimationItem {
  serviceId: string | null;
  serviceName: string;
  /** Net price in grosze */
  priceNet: number;
  vatRate: number;
  /** Gross price in grosze */
  priceGross: number;
}

export interface LeadEstimation {
  id: string;
  status: string;
  extractedNeeds: string[];
  matchedItems: LeadEstimationItem[];
  unmatchedNeeds: string[];
  /** Total net value in grosze */
  totalNet: number;
  /** Total gross value in grosze */
  totalGross: number;
  /** Visits that contributed to building this estimation */
  relatedVisits: RelatedVisit[];
  /** System-generated reasoning used to produce the estimation */
  aiReasoning?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// User quote types (user-defined, independent of AI estimation)
// ---------------------------------------------------------------------------

export interface LeadUserQuoteItem {
  id: string;
  serviceId?: string | null;
  serviceName: string;
  /** Net price in grosze */
  priceNet: number;
  vatRate: number;
  /** Gross price in grosze */
  priceGross: number;
}

export interface LeadUserQuote {
  id: string;
  items: LeadUserQuoteItem[];
  /** Total net value in grosze */
  totalNet: number;
  /** Total gross value in grosze */
  totalGross: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveUserQuoteItemRequest {
  serviceId?: string | null;
  serviceName?: string;
  /** Net price in grosze */
  priceNet: number;
  vatRate: number;
  /** Gross price in grosze */
  priceGross: number;
}

export interface SaveUserQuoteRequest {
  items: SaveUserQuoteItemRequest[];
}

/** Full lead detail — extends Lead with AI estimation and user quote */
export interface LeadDetail extends Lead {
  estimation: LeadEstimation | null;
  userQuote: LeadUserQuote | null;
}
