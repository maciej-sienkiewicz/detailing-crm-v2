import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';

export type DashboardHintKind =
    | 'WORKTIME_MISSING'
    | 'WORKTIME_UNUSED'
    | 'COMPETITOR_STANDOUT'
    | 'UNREAD_MAIL'
    | 'SELF_IG_SILENT'
    | 'KSEF_UPSELL';

export type DashboardHintActionType = 'NAVIGATE' | 'EXTERNAL' | 'DISABLE_WORKTIME';

export interface DashboardHintAction {
    label: string;
    type: DashboardHintActionType;
    url: string | null;
}

export interface DashboardHint {
    key: string;
    kind: DashboardHintKind;
    text: string;
    action: DashboardHintAction | null;
    permanentDismiss: boolean;
}

const HINTS_KEY = ['dashboard', 'hints'] as const;

/**
 * Podpowiedzi paska na Tablicy. Serwer zwraca listę posortowaną po ważności
 * i już przefiltrowaną z zamkniętych — frontend pokazuje pierwszą.
 */
export const useDashboardHints = () => {
    const { data } = useQuery({
        queryKey: HINTS_KEY,
        queryFn: async () => {
            const response = await apiClient.get<{ hints: DashboardHint[] }>('/v1/dashboard/hints');
            return response.data.hints;
        },
        // Podpowiedzi to nie licznik na żywo: raz na wejście na Tablicę wystarczy.
        staleTime: 5 * 60_000,
    });

    return { hints: data ?? [] };
};

export const useDismissDashboardHint = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (key: string) => {
            await apiClient.post(`/v1/dashboard/hints/${encodeURIComponent(key)}/dismiss`);
        },
        // Optymistycznie: zamknięcie ma znikać od razu, nie po rundzie do serwera.
        onMutate: async (key: string) => {
            await queryClient.cancelQueries({ queryKey: HINTS_KEY });
            const previous = queryClient.getQueryData<DashboardHint[]>(HINTS_KEY);
            queryClient.setQueryData<DashboardHint[]>(HINTS_KEY, hints =>
                (hints ?? []).filter(hint => hint.key !== key)
            );
            return { previous };
        },
        onError: (_error, _key, context) => {
            if (context?.previous) queryClient.setQueryData(HINTS_KEY, context.previous);
        },
    });
};

export const useDisableWorkTimeTracking = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await apiClient.post('/v1/dashboard/hints/worktime/disable');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: HINTS_KEY });
        },
    });
};
