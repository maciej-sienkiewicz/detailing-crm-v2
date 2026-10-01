import { useEntitlements } from '../api/subscriptionQueries';
import type { CapabilityKey, CapabilityStatus } from '../types';
import { SUBSCRIPTION_LOCK_REASON } from '../utils/subscriptionLock';

export interface UseCapabilityResult extends CapabilityStatus {
    /**
     * True while entitlements are still loading. Gates default to LOCKED during
     * load (fail-closed); call sites that would flash a lock for a paying studio
     * can render a skeleton/nothing while this is true instead.
     */
    isLoading: boolean;
    /** "Wymaga modułu: X", ready-made reason line for tooltips and disabled hints. */
    lockReason: string | null;
    /**
     * Disabled because the subscription is not active, not because a module is
     * missing. `missingFeatures` and `upsell` are then empty on purpose: offering
     * to buy a module the studio may already have, while what it lacks is a
     * renewal, sent owners into a second purchase. Point to the plan settings.
     */
    lockedBySubscription: boolean;
}

const FALLBACK: CapabilityStatus = {
    enabled: false,
    displayName: '',
    missingFeatures: [],
    upsell: [],
};

/**
 * The ONLY sanctioned way to gate UI on purchased modules.
 *
 * Returns the backend-resolved decision for a business action, including
 * cross-module rules; never combine multiple `useFeature` calls to emulate
 * this (that re-implements the expression and will drift from the backend).
 *
 * Fail-closed: while loading or on error the capability reads as disabled.
 */
export const useCapability = (capability: CapabilityKey): UseCapabilityResult => {
    const { data, isLoading } = useEntitlements();

    const status = data?.capabilities?.[capability] ?? FALLBACK;
    const lockedBySubscription = !status.enabled
        && (status.lockedBy === 'SUBSCRIPTION' || data?.subscriptionActive === false);

    if (lockedBySubscription) {
        return {
            ...status,
            missingFeatures: [],
            upsell: [],
            isLoading,
            lockReason: SUBSCRIPTION_LOCK_REASON,
            lockedBySubscription,
        };
    }

    const lockReason = status.enabled || status.missingFeatures.length === 0
        ? null
        : `Wymaga modułu: ${status.missingFeatures.map((f) => f.displayName).join(', ')}`;

    return { ...status, isLoading, lockReason, lockedBySubscription };
};
