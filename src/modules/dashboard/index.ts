/**
 * Dashboard Module Exports
 */

// Views
export { DashboardView } from './views/DashboardView';

// Hooks
export { useDashboard, DASHBOARD_STATS_KEY } from './hooks';

// Types
export type {
  OperationalStats,
  BusinessMetric,
  IncomingCall,
  DashboardData,
  VisitDetail,
  GoogleReview,
  GoogleReviewsData,
  CompetitorRanking,
} from './types';

// Components (if needed for external usage)
export { OperationalScorecard } from './components/OperationalScorecard';
