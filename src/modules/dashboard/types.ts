/**
 * Dashboard Module Types
 * Defines data structures for operational metrics, business analytics, and incoming calls
 */

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
}
