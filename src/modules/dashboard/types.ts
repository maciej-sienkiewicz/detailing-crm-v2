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
}

/**
 * Operational statistics showing current work status
 */
export interface OperationalStats {
  /** Number of orders currently being worked on */
  inProgress: number;
  /** Number of completed orders ready for customer pickup */
  readyForPickup: number;
  /** Number of new orders scheduled to arrive today */
  incomingToday: number;
  /** Details of visits in progress */
  inProgressDetails: VisitDetail[];
  /** Details of visits ready for pickup */
  readyForPickupDetails: VisitDetail[];
  /** Details of visits arriving today */
  incomingTodayDetails: VisitDetail[];
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
 * Complete dashboard data response
 */
export interface DashboardData {
  /** Operational statistics */
  stats: OperationalStats;
  /** Revenue metric with week-over-week comparison */
  revenue: BusinessMetric;
  /** Call activity metric with week-over-week comparison */
  callActivity: BusinessMetric;
  /** List of recent incoming calls */
  recentCalls: IncomingCall[];
  /** Google reviews statistics */
  googleReviews: GoogleReviewsData;
}

// ─── WebSocket Event Types ───────────────────────────────────────────────────

/**
 * Supported dashboard event types
 */
export const DashboardEventType = {
  NEW_INBOUND_CALL: 'NEW_INBOUND_CALL',
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
