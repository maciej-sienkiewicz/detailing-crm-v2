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
} from './types';

// Components (if needed for external usage)
export { OperationalScorecard } from './components/OperationalScorecard';
export { AnalyticsSection } from './components/AnalyticsSection';
export { LeadInbox } from './components/LeadInbox';
export { SocialMediaPlaceholder } from './components/SocialMediaPlaceholder';
