import { useEntitlements } from '../api/subscriptionQueries';
import type { FeatureKey, FeatureStatus } from '../types';

const FALLBACK_FEATURE: FeatureStatus = {
    enabled: false,
    source: null,
    upsell: null,
};

export const useFeature = (featureKey: FeatureKey): FeatureStatus => {
    const { data } = useEntitlements();

    if (!data) return FALLBACK_FEATURE;

    return data.features[featureKey] ?? FALLBACK_FEATURE;
};
