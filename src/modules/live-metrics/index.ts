// src/modules/live-metrics/index.ts
export { LiveMetricsView } from './views/LiveMetricsView';

export { useLiveMetricsOverview, useHourProfile, LIVE_METRICS_OVERVIEW_KEY } from './hooks/useLiveMetrics';
export { useLiveMetricsSocket } from './hooks/useLiveMetricsSocket';
export { applyLiveEvent } from './hooks/applyLiveEvent';
export { liveMetricsApi } from './api/liveMetricsApi';

export type {
    BusinessEventDto,
    BusinessEventType,
    BucketSize,
    HourProfileResponse,
    LiveMetricsFrame,
    LiveMetricsOverview,
    PhotoTarget,
    RangeKey,
    SeriesDescriptor,
    SeriesName,
    SeriesPoint,
    SeriesResponse,
    SeriesStats,
    ServiceKind,
    VisitOrigin,
} from './types';
