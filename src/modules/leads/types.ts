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
 * Service tag attached to a lead (manual categorization)
 */
export interface ServiceTag {
  serviceId: string | null;
  serviceName: string;
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

  /** System-generated summary for this lead */
  summary?: string;

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

  /** ID of visit linked to this lead */
  visitId?: string | null;

  /**
   * Potential revenue in grosze (cents) for decimal precision
   * e.g., 250000 = 2500.00 PLN
   */
  estimatedValue: number;

  /**
   * LLM processing status for this lead's estimation.
   * null  — manual lead, no LLM analysis
   * PENDING — LLM is still processing
   * COMPLETED — estimation ready
   * FAILED — LLM analysis failed
   */
  estimationStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | null;

  /**
   * Flag for records coming from WebSockets/Phone that need verification
   */
  requiresVerification: boolean;

  /** Customer from the database assigned to this lead */
  assignedCustomer?: CustomerSnapshot | null;

  /** UUID of the studio user responsible for this lead */
  assignedUserId?: string | null;

  /** Display name of the assigned user (denormalized) */
  assignedUserName?: string | null;

  /** Reason why the lead was lost (set when status → LOST) */
  lostReason?: string | null;

  /** Service tags manually assigned to this lead */
  serviceTags?: ServiceTag[];

  /** ISO timestamp of new unacknowledged activity (email reply appended); null if none */
  newActivityAt?: string | null;
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
  /** Filter by min estimated value (grosze) */
  valueMin?: number;
  /** Filter by max estimated value (grosze) */
  valueMax?: number;
  /** Filter by assigned user UUID */
  assignedUserId?: string;
  /** Filter by service UUIDs (leads tagged with any of these services) */
  serviceIds?: string[];
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
  NEW_LEAD = 'NEW_LEAD',
  LEAD_UPDATED = 'LEAD_UPDATED',
  LEAD_STATUS_CHANGED = 'LEAD_STATUS_CHANGED',
  REPLY_APPENDED = 'REPLY_APPENDED',
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
 * Payload for NEW_LEAD event
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
  /** System-generated summary used to produce the estimation */
  aiSummary?: string;
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

export interface GenerateQuoteReplyResponse {
  title: string;
  reply: string;
}

// ---------------------------------------------------------------------------
// Service analytics (GET /api/v1/leads/service-analytics)
// ---------------------------------------------------------------------------

export interface ServiceAnalyticsItem {
  serviceId: string | null;
  serviceName: string;
  wonCount: number;
  lostCount: number;
  totalCount: number;
  winRate: number;
}

// ---------------------------------------------------------------------------
// Employee stats (GET /api/v1/leads/employee-stats)
// ---------------------------------------------------------------------------

export interface EmployeeStats {
  userId: string;
  userName: string;
  totalLeads: number;
  converted: number;
  lost: number;
  conversionRate: number;
  avgLeadValueCents: number;
}

// ---------------------------------------------------------------------------
// Lead alert configuration (GET/PATCH /api/v1/company/lead-alert-config)
// ---------------------------------------------------------------------------

export interface LeadAlertConfig {
  leadStagnantOurThresholdHours: number;
  leadStagnantClientThresholdHours: number;
}

// ---------------------------------------------------------------------------
// Time analytics (GET /api/v1/leads/time-analytics)
// ---------------------------------------------------------------------------

export interface TimeAnalyticsBucket {
  bucket: number;
  incomingCount: number;
  acceptedCount: number;
  rejectedCount: number;
}

export interface TimeAnalyticsResponse {
  byHour: TimeAnalyticsBucket[];
  byDayOfMonth: TimeAnalyticsBucket[];
}

export interface TimeAnalyticsParams {
  timezone?: string;
  valueMin?: number;
  valueMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

// ---------------------------------------------------------------------------
// Time analytics interpretation (POST /api/v1/leads/time-analytics/interpret)
// ---------------------------------------------------------------------------

export type TimeAnalyticsBucketType = 'BY_HOUR' | 'BY_DAY_OF_MONTH';
export type TimeAnalyticsActionType = 'INCOMING' | 'ACCEPTED' | 'REJECTED';

export interface InterpretTimeAnalyticsRequest {
  bucketType: TimeAnalyticsBucketType;
  actionTypes: TimeAnalyticsActionType[];
  buckets: TimeAnalyticsBucket[];
}

export interface InterpretTimeAnalyticsInsight {
  bucketLabel: string;
  observation: string;
  causalExplanation: string;
}

export interface InterpretTimeAnalyticsRecommendations {
  bestTimeToCall: string;
  bestTimeToRemind: string;
  adCampaignTiming: string;
  socialMediaTiming: string;
}

export interface InterpretTimeAnalyticsResponse {
  summary: string;
  insights: InterpretTimeAnalyticsInsight[];
  recommendations: InterpretTimeAnalyticsRecommendations;
}

// ---------------------------------------------------------------------------
// Request types for new endpoints
// ---------------------------------------------------------------------------

export interface AssignLeadUserRequest {
  userId: string | null;
  userName?: string;
}

export interface SetLostReasonRequest {
  lostReason: string | null;
}

export interface SetServiceTagsRequest {
  tags: ServiceTag[];
}

// ---------------------------------------------------------------------------
// Split / Merge
// ---------------------------------------------------------------------------

export interface SplitCommentResponse {
  newLeadId: string;
  sourceLeadId: string;
}

export interface MergeLeadRequest {
  targetLeadId: string;
}

export interface MergeLeadResponse {
  targetLeadId: string;
}

// ---------------------------------------------------------------------------
// Comments (GET|POST /api/v1/leads/{id}/comments, PATCH|DELETE .../comments/{commentId})
// ---------------------------------------------------------------------------

export interface LeadCommentDto {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
  updatedAt: string | null;
}

export interface AddCommentRequest {
  content: string;
}

export interface EditCommentRequest {
  content: string;
}

// ---------------------------------------------------------------------------
// Status history (GET /api/v1/leads/{id}/status-history)
// ---------------------------------------------------------------------------

export type LeadHistoryAction =
  | 'CREATE'
  | 'STATUS_CHANGE'
  | 'LEAD_CONFIRMED'
  | 'LEAD_COMPLETED'
  | 'LEAD_LOST'
  | 'LEAD_NO_SHOW'
  | 'LEAD_CONVERTED'
  | 'LEAD_ABANDONED'
  | 'LEAD_APPOINTMENT_CREATED'
  | 'LEAD_USER_ASSIGNED'
  | 'LEAD_CUSTOMER_ASSIGNED'
  | 'LEAD_LOST_REASON_UPDATED'
  | 'LEAD_QUOTE_UPDATED'
  | 'LEAD_COMMENT_UPDATED';

/** Single field change within a history entry */
export interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface QuoteReplyExampleDto {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdByName: string;
  updatedBy: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadStatusHistoryEntry {
  changedAt: string;
  action: LeadHistoryAction;
  changedByUserId: string;
  changedByName: string;
  /** @deprecated Backend now puts status in changes[]. Keep for backward compat. */
  fromStatus?: LeadStatus | null;
  /** @deprecated Backend now puts status in changes[]. Keep for backward compat. */
  toStatus?: LeadStatus | null;
  changes?: FieldChange[];
}
