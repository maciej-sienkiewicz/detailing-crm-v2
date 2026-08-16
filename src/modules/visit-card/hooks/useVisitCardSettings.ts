// src/modules/visit-card/hooks/useVisitCardSettings.ts
//
// Studio-level Visit Card configuration, shared by the booking modal,
// the check-in wizard and the settings screen.

import { useQuery } from '@tanstack/react-query';
import { useCapability } from '@/modules/subscription';
import { visitCardApi } from '../api/visitCardApi';

export const VISIT_CARD_SETTINGS_QUERY_KEY = ['visit-card-settings'] as const;

export const useVisitCardSettings = () => {
    // Module possession comes from the ONE entitlements source (/v1/me/entitlements),
    // not from the legacy `smsModuleActive` flag piggybacking on this endpoint —
    // two unreconciled sources of truth for the same module caused drift.
    const comms = useCapability('COMM_SEND_TRANSACTIONAL');

    const { data, isPending } = useQuery({
        queryKey: VISIT_CARD_SETTINGS_QUERY_KEY,
        queryFn: visitCardApi.getSettings,
        staleTime: 60_000,
    });

    return {
        settings: data,
        /** Card usable at all: master switch on AND the communication module purchased. */
        visitCardActive: (data?.enabled ?? false) && comms.enabled,
        sendByDefault: data?.sendByDefault ?? false,
        smsModuleActive: comms.enabled,
        isPending,
    };
};
