// src/modules/visit-card/hooks/useVisitCardSettings.ts
//
// Studio-level Visit Card configuration, shared by the booking modal,
// the check-in wizard and the settings screen.

import { useQuery } from '@tanstack/react-query';
import { visitCardApi } from '../api/visitCardApi';

export const VISIT_CARD_SETTINGS_QUERY_KEY = ['visit-card-settings'] as const;

export const useVisitCardSettings = () => {
    const { data, isPending } = useQuery({
        queryKey: VISIT_CARD_SETTINGS_QUERY_KEY,
        queryFn: visitCardApi.getSettings,
        staleTime: 60_000,
    });

    return {
        settings: data,
        /** Card usable at all: master switch on AND the SMS module purchased. */
        visitCardActive: (data?.enabled ?? false) && (data?.smsModuleActive ?? false),
        sendByDefault: data?.sendByDefault ?? false,
        smsModuleActive: data?.smsModuleActive ?? false,
        isPending,
    };
};
