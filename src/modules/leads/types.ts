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
  IN_PROGRESS = 'IN_PROGRESS', // Contacted
  CONVERTED = 'CONVERTED',   // Closed Won
  ABANDONED = 'ABANDONED',   // Closed Lost
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

  /** ISO timestamp of when the lead was created */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt?: string;

  /**
   * Potential revenue in grosze (cents) for decimal precision
   * e.g., 250000 = 2500.00 PLN
   */
  estimatedValue: number;

  /**
   * Flag for records coming from WebSockets/Phone that need verification
   */
  requiresVerification: boolean;
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
 * Pipeline summary for dashboard widget
 */
export interface LeadPipelineSummary {
  /** Total estimated value of IN_PROGRESS leads in grosze */
  totalPipelineValue: number;
  /** Count of IN_PROGRESS leads */
  inProgressCount: number;
  /** Count of CONVERTED leads */
  convertedCount: number;
  /** Count of ABANDONED leads */
  abandonedCount: number;
  /** Number of leads converted this week */
  convertedThisWeekCount: number;
  /** Value of leads converted this week in grosze */
  convertedThisWeekValue: number;
  /** Number of leads converted previous week */
  convertedPreviousWeekCount: number;
  /** Value of leads converted previous week in grosze */
  convertedPreviousWeekValue: number;
  /** Total value of leads created this month in grosze */
  leadsValueThisMonth: number;
  /** Value of converted leads this month in grosze */
  convertedValueThisMonth: number;
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
