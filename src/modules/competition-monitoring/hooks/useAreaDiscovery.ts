import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';
import type { SaveLocationTracking } from '../types';

/**
 * Odkrywanie obszaru: „kto jeszcze reklamuje się na frazy X w rejonie Y".
 *
 * Dane pochodzą ze wspólnego cache serwera (odświeżanego 2×/dobę), więc trzymamy
 * je u siebie długo - przełączanie zakładek nie ma po co odpytywać. Podgląd na
 * żywo to mutacja (bez zapisu), zapisane śledzenia to zapytania z listą i wynikami.
 */

export const AREA_KEYS = {
    trackings: 'ig-area-trackings',
    results: 'ig-area-results',
} as const;

const STALE_TIME = 5 * 60 * 1000;

export const useLocationTrackings = (enabled = true) =>
    useQuery({
        queryKey: [AREA_KEYS.trackings],
        queryFn: () => instagramApi.listLocationTrackings(),
        staleTime: STALE_TIME,
        enabled,
    });

/** Wyniki zapisanego śledzenia; pobierane dopiero po wybraniu śledzenia. */
export const useTrackingResults = (trackingId: string | null) =>
    useQuery({
        queryKey: [AREA_KEYS.results, trackingId],
        queryFn: () => instagramApi.getLocationTrackingResults(trackingId!),
        staleTime: STALE_TIME,
        enabled: !!trackingId,
    });

/**
 * Podgląd na żywo bez zapisu. Odpalany na żądanie (przycisk „Pokaż"), bo nieznana
 * fraza uruchamia pobranie z Meta i wchodzi we wspólny limit 200/godz.
 */
export const usePreviewAreaDiscovery = () =>
    useMutation({
        mutationFn: (request: SaveLocationTracking) => instagramApi.previewAreaDiscovery(request),
    });

export const useCreateLocationTracking = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: SaveLocationTracking) => instagramApi.createLocationTracking(request),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [AREA_KEYS.trackings] }),
    });
};

export const useUpdateLocationTracking = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, request }: { id: string; request: SaveLocationTracking }) =>
            instagramApi.updateLocationTracking(id, request),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [AREA_KEYS.trackings] });
            queryClient.invalidateQueries({ queryKey: [AREA_KEYS.results, variables.id] });
        },
    });
};

export const useDeleteLocationTracking = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => instagramApi.deleteLocationTracking(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [AREA_KEYS.trackings] }),
    });
};
