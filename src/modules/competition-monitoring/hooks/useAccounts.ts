import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { accountsApi } from '../api/accountsApi';
import type { InstagramStudioSettings } from '../accountsTypes';
import { ANALYTICS_KEYS } from './useAnalytics';

/**
 * Własne konta studia. Klucze pod jednym przedrostkiem, żeby powrót z logowania
 * (Facebook albo Google) mógł unieważnić wszystko jednym wywołaniem.
 */
export const ACCOUNTS_KEY = ['instagram', 'accounts'] as const;
export const CONNECTION_KEY = [...ACCOUNTS_KEY, 'connection'] as const;
export const MINE_KEY = [...ACCOUNTS_KEY, 'me'] as const;
export const THREADS_KEY = [...ACCOUNTS_KEY, 'dm-threads'] as const;
export const PUBLISH_VISITS_KEY = [...ACCOUNTS_KEY, 'publish-visits'] as const;
export const SETTINGS_KEY = [...ACCOUNTS_KEY, 'settings'] as const;
export const GOOGLE_KEY = ['google-business'] as const;

/**
 * Po połączeniu albo odłączeniu konta zmienia się też Przegląd modułu (kafle własnych
 * liczb, „Do zrobienia") - unieważniamy go po jego własnym kluczu.
 */
export const invalidateAccounts = (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    queryClient.invalidateQueries({ queryKey: GOOGLE_KEY });
    queryClient.invalidateQueries({ queryKey: [ANALYTICS_KEYS.home] });
};

export const useInstagramConnection = () =>
    useQuery({ queryKey: CONNECTION_KEY, queryFn: accountsApi.getConnection, staleTime: 60_000 });

export const useMyInstagram = (enabled: boolean) =>
    useQuery({ queryKey: MINE_KEY, queryFn: accountsApi.getMine, enabled, staleTime: 5 * 60_000 });

export const useDmThreads = (enabled: boolean) =>
    useQuery({ queryKey: THREADS_KEY, queryFn: accountsApi.listThreads, enabled, staleTime: 60_000 });

export const usePublishVisits = (enabled: boolean) =>
    useQuery({ queryKey: PUBLISH_VISITS_KEY, queryFn: accountsApi.listPublishVisits, enabled, staleTime: 5 * 60_000 });

export const useGoogleBusiness = () =>
    useQuery({ queryKey: GOOGLE_KEY, queryFn: accountsApi.getGoogle, staleTime: 5 * 60_000 });

export const usePostingPlan = () => {
    const queryClient = useQueryClient();
    const query = useQuery({ queryKey: SETTINGS_KEY, queryFn: accountsApi.getSettings, staleTime: 5 * 60_000 });
    const save = useMutation({
        mutationFn: (settings: InstagramStudioSettings) => accountsApi.saveSettings(settings),
        onSuccess: saved => {
            queryClient.setQueryData(SETTINGS_KEY, saved);
            // Plan liczy „Posty w październiku: 3 z 8" w Przeglądzie.
            queryClient.invalidateQueries({ queryKey: [ANALYTICS_KEYS.home] });
        },
    });
    return { query, save };
};

export const useAccountActions = () => {
    const queryClient = useQueryClient();
    const invalidate = () => invalidateAccounts(queryClient);

    const connect = useMutation({
        mutationFn: accountsApi.startConnection,
        onSuccess: url => window.location.assign(url),
    });
    const select = useMutation({ mutationFn: accountsApi.selectConnection, onSuccess: invalidate });
    const disconnect = useMutation({ mutationFn: accountsApi.disconnect, onSuccess: invalidate });
    const sync = useMutation({
        mutationFn: accountsApi.syncMine,
        onSuccess: mine => {
            queryClient.setQueryData(MINE_KEY, mine);
            queryClient.invalidateQueries({ queryKey: CONNECTION_KEY });
        },
    });

    const connectGoogle = useMutation({
        mutationFn: accountsApi.startGoogle,
        onSuccess: url => window.location.assign(url),
    });
    const selectGoogle = useMutation({ mutationFn: accountsApi.selectGoogle, onSuccess: invalidate });
    const disconnectGoogle = useMutation({ mutationFn: accountsApi.disconnectGoogle, onSuccess: invalidate });
    const syncGoogle = useMutation({
        mutationFn: accountsApi.syncGoogle,
        onSuccess: google => queryClient.setQueryData(GOOGLE_KEY, google),
    });
    const replyToReview = useMutation({
        mutationFn: ({ reviewId, comment }: { reviewId: string; comment: string }) =>
            accountsApi.replyToReview(reviewId, comment),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: GOOGLE_KEY }),
    });

    return { connect, select, disconnect, sync, connectGoogle, selectGoogle, disconnectGoogle, syncGoogle, replyToReview };
};
