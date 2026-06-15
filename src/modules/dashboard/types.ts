/**
 * Dashboard Module Types
 * Defines data structures for operational metrics, business analytics, and incoming calls
 */

/**
 * Visit detail for operational stats hover
 */
export interface VisitDetail {
  /** Unique visit identifier */
  id: string;
  name: string;
  /** Vehicle brand */
  brand: string;
  /** Vehicle model */
  model: string;
  /** Visit value in PLN */
  amount: number;
  /** Customer first name */
  customerFirstName: string;
  /** Customer last name */
  customerLastName: string;
  /** Customer phone number (optional) */
  phoneNumber?: string;
  /** Estimated completion date (ISO) */
  estimatedCompletionDate?: string;
  /** Scheduled/start date of the visit or appointment (ISO) */
  scheduledDate?: string;
}

/**
 * Operational statistics showing current work status
 */
export interface OperationalStats {
  /** Number of orders currently being worked on */
  inProgress: number;
  /** Number of visits that are overdue (past estimated completion date) */
  overdue?: number;
  /** Number of completed orders ready for customer pickup */
  readyForPickup: number;
  /** Number of new orders scheduled to arrive today */
  incomingToday: number;
  /** Number of reservations abandoned in the last 30 days */
  abandonedLast30Days: number;
  /** Details of visits in progress */
  inProgressDetails: VisitDetail[];
  /** Details of visits ready for pickup */
  readyForPickupDetails: VisitDetail[];
  /** Details of visits arriving today */
  incomingTodayDetails: VisitDetail[];
  /** Details of abandoned reservations in the last 30 days */
  abandonedDetails?: VisitDetail[];
}

/**
 * Revenue summary from dedicated endpoint
 */
export interface DashboardRevenueBucket {
  weekStart: string;
  grossAmount: number;
  currency: string;
}

export interface DashboardRevenueSummary {
  currentWeek: { grossAmount: number; currency: string };
  previousWeek: { grossAmount: number; currency: string };
  deltaPercentage: number;
  buckets: DashboardRevenueBucket[];
}

/**
 * Reservation count summary from dedicated endpoint
 */
export interface DashboardReservationBucket {
  weekStart: string;
  count: number;
}

export interface DashboardReservationSummary {
  currentWeek: { count: number };
  previousWeek: { count: number };
  deltaPercentage: number;
  buckets: DashboardReservationBucket[];
}

/**
 * Business metric with comparison to previous period
 */
export interface BusinessMetric {
  /** Current period value */
  currentValue: number;
  /** Previous period value for comparison */
  previousValue: number;
  /** Percentage change from previous to current period */
  deltaPercentage: number;
  /** Unit of measurement (e.g., 'PLN', 'calls') */
  unit: string;
}

/**
 * Incoming call record for lead inbox
 */
export interface IncomingCall {
  /** Unique identifier for the call */
  id: string;
  /** Phone number of the caller */
  phoneNumber: string;
  /** Name of the contact (if identified) */
  contactName?: string;
  /** ISO timestamp of when the call was received */
  timestamp: string;
  /** Optional note about the call */
  note?: string;
}

/**
 * Individual Google review
 */
export interface GoogleReview {
  /** Unique review identifier */
  id: string;
  /** Reviewer name */
  authorName: string;
  /** Rating (1-5 stars) */
  rating: number;
  /** Review text */
  text: string;
  /** ISO timestamp of review */
  timestamp: string;
  /** Whether business replied */
  hasReply: boolean;
}

/**
 * Competitor ranking data
 */
export interface CompetitorRanking {
  /** Business name */
  name: string;
  /** Average rating */
  rating: number;
  /** Number of reviews */
  reviewCount: number;
  /** Position in search results (1-based) */
  position: number;
  /** Whether this is our business */
  isOurs: boolean;
}

/**
 * Google reviews statistics
 */
export interface GoogleReviewsData {
  /** Current average rating */
  averageRating: number;
  /** Total number of reviews */
  totalReviews: number;
  /** Number of new reviews (last 30 days) */
  newReviews: number;
  /** Recent reviews */
  recentReviews: GoogleReview[];
  /** Competitor rankings in region */
  competitors: CompetitorRanking[];
}

/**
 * Status badge variant for visit rows
 */
export type VisitStatusKind = 'info' | 'warn' | 'neutral' | 'success' | 'err';

/**
 * Upcoming visit entry shown in "Najbliższe wizyty" panel
 */
export interface UpcomingVisit {
  id: string;
  type: 'VISIT' | 'RESERVATION';
  time: string;
  dateLabel: string;
  /** ISO date string (YYYY-MM-DD) used to render the calendar chip */
  isoDate: string;
  serviceName: string;
  customerName: string;
  vehicleName: string;
  price: number;
  priceNetto: number;
  statusKind: VisitStatusKind;
  statusLabel: string;
}

/**
 * Task item shown in "Do zrobienia" panel
 */
export interface DashboardTask {
  id: string;
  title: string;
  meta: string;
  done: boolean;
  createdAt?: string;
}

export interface CreateTaskPayload {
  title: string;
  meta?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  meta?: string;
  done?: boolean;
}

/**
 * Archived task entry returned by GET /api/v1/tasks/archive
 */
export interface ArchivedTask {
  id: string;
  title: string;
  meta: string | null;
  done: boolean;
  createdAt: string;
  createdByUserName: string;
  completedAt: string | null;
  completedByUserName: string | null;
  deletedAt: string;
  deletedByUserName: string;
}

export interface TaskArchivePage {
  items: ArchivedTask[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Complete dashboard data response
 */
export interface DashboardData {
  /** Operational statistics */
  stats: OperationalStats;
  /** Revenue metric with week-over-week comparison */
  revenue: BusinessMetric;
  /** Call activity metric with week-over-week comparison */
  callActivity: BusinessMetric;
  /** Instagram photos posted this week vs last week */
  instagramPhotos?: BusinessMetric;
  /** List of recent incoming calls */
  recentCalls: IncomingCall[];
  /** Google reviews statistics */
  googleReviews: GoogleReviewsData;
  /** To-do task list */
  tasks?: DashboardTask[];
}

// ─── WebSocket Event Types ───────────────────────────────────────────────────

/**
 * Supported dashboard event types
 */
export const DashboardEventType = {
  NEW_LEAD: 'NEW_LEAD',
} as const;

export type DashboardEventType = (typeof DashboardEventType)[keyof typeof DashboardEventType];

/**
 * Payload for a new inbound call event
 */
export interface InboundCallPayload {
  /** Unique call identifier */
  id: string;
  /** Caller phone number */
  phoneNumber: string;
  /** Caller name (if identified) */
  callerName?: string;
  /** ISO timestamp of when the call was received */
  receivedAt: string;
}

/**
 * Generic dashboard event wrapper received via WebSocket
 */
export interface DashboardEvent<T = unknown> {
  /** Event type discriminator */
  type: DashboardEventType;
  /** ISO timestamp of when the event was generated */
  timestamp: string;
  /** Event-specific payload */
  payload: T;
}
