import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';
import { ANALYTICS_KEYS } from './useAnalytics';
import { INSTAGRAM_PROFILES_KEY } from './useInstagramProfiles';

/**
 * Reklamy konkurencji. Dane odświeżają się raz na dobę (sync z Biblioteką reklam),
 * więc trzymamy je długo - przełączanie zakładek nie ma po co odpytywać serwera.
 */

export const ADS_KEYS = {
    calendar: 'ig-ads-calendar',
    detail: 'ig-ads-detail',
} as const;

const STALE_TIME = 5 * 60 * 1000;

export const useAdCalendar = (year: number, enabled = true) =>
    useQuery({
        queryKey: [ADS_KEYS.calendar, year],
        queryFn: () => instagramApi.getAdCalendar(year),
        staleTime: STALE_TIME,
        enabled,
    });

/** Szczegóły kampanii pobierane dopiero po otwarciu okna - w kalendarzu ich nie widać. */
export const useAdDetail = (adId: string | null) =>
    useQuery({
        queryKey: [ADS_KEYS.detail, adId],
        queryFn: () => instagramApi.getAdDetail(adId!),
        staleTime: STALE_TIME,
        enabled: !!adId,
    });

/**
 * Wskazanie strony na Facebooku. Po udanym powiązaniu unieważniamy kalendarz
 * i listę profili: profil przestaje być „bez powiązania", ale reklam nabierze
 * dopiero po najbliższej synchronizacji.
 */
export const useLinkFacebookPage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ profileId, pageId, pageName }: { profileId: string; pageId: string; pageName?: string }) =>
            instagramApi.linkFacebookPage(profileId, pageId, pageName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ADS_KEYS.calendar] });
            queryClient.invalidateQueries({ queryKey: [INSTAGRAM_PROFILES_KEY] });
            queryClient.invalidateQueries({ queryKey: [ANALYTICS_KEYS.digest] });
        },
    });
};
