import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';
import type { SaveAreaSettings } from '../types';

/**
 * Odkrywanie obszaru: „kto jeszcze reklamuje się w moim rejonie".
 *
 * Jedno ustawienie na studio i jedna, stronicowana tabela wyników. Dane pochodzą
 * ze wspólnego cache serwera, odświeżanego strumieniem przez całą dobę, więc
 * trzymamy je u siebie długo — przełączanie zakładek nie ma po co odpytywać.
 */

export const AREA_KEYS = {
    settings: 'ig-area-settings',
    results: 'ig-area-results',
    catalog: 'ig-area-phrase-catalog',
    blocks: 'ig-area-blocks',
} as const;

const STALE_TIME = 5 * 60 * 1000;

export const useAreaSettings = (enabled = true) =>
    useQuery({
        queryKey: [AREA_KEYS.settings],
        queryFn: () => instagramApi.getAreaSettings(),
        staleTime: STALE_TIME,
        enabled,
    });

/** Strona tabeli. Klucz zawiera numer strony, więc powrót na poprzednią jest natychmiastowy. */
export const useAreaResults = (page: number) =>
    useQuery({
        queryKey: [AREA_KEYS.results, page],
        queryFn: () => instagramApi.getAreaResults(page),
        staleTime: STALE_TIME,
    });

/**
 * Zapis rejonu. Unieważnia WSZYSTKIE strony wyników, nie tylko bieżącą: zmiana
 * rejonu albo fraz przestawia całą tabelę, więc strona druga sprzed zmiany
 * opisywałaby już co innego.
 */
export const useSaveAreaSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: SaveAreaSettings) => instagramApi.saveAreaSettings(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AREA_KEYS.settings] });
            queryClient.invalidateQueries({ queryKey: [AREA_KEYS.results] });
        },
    });
};

/**
 * Katalog fraz. Zmienia się wyłącznie z wdrożeniem aplikacji, więc trzymamy go
 * bez przeterminowania - odpytywanie co pięć minut o stałą listę to czysty koszt.
 */
export const usePhraseCatalog = (enabled = true) =>
    useQuery({
        queryKey: [AREA_KEYS.catalog],
        queryFn: () => instagramApi.getPhraseCatalog(),
        staleTime: Infinity,
        enabled,
    });

export const useBlockedAdvertisers = (enabled = true) =>
    useQuery({
        queryKey: [AREA_KEYS.blocks],
        queryFn: () => instagramApi.listBlockedAdvertisers(),
        staleTime: STALE_TIME,
        enabled,
    });

/**
 * Ukrycie i przywrócenie reklamodawcy. Oba unieważniają wszystkie strony wyników:
 * ukrycie firmy przesuwa wiersze między stronami, więc żadna nie zostaje aktualna.
 */
export const useBlockAdvertiser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ pageId, pageName }: { pageId: string; pageName: string | null }) =>
            instagramApi.blockAdvertiser(pageId, pageName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AREA_KEYS.results] });
            queryClient.invalidateQueries({ queryKey: [AREA_KEYS.blocks] });
        },
    });
};

/**
 * Odznaczenie nowości. Unieważnia wszystkie strony wyników (odznaki gasną i wiersze
 * wracają do zwykłej kolejności, więc żadna strona nie zostaje aktualna), ustawienia
 * oraz podpowiedzi Tablicy — pasek liczy nowości z tego samego ustawienia, więc
 * zostawiony bez odświeżenia mówiłby o czymś, czego w tabeli już nie widać.
 */
export const useAcknowledgeAreaNovelty = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => instagramApi.acknowledgeAreaNovelty(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AREA_KEYS.results] });
            queryClient.invalidateQueries({ queryKey: [AREA_KEYS.settings] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'hints'] });
        },
    });
};

export const useUnblockAdvertiser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (pageId: string) => instagramApi.unblockAdvertiser(pageId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AREA_KEYS.results] });
            queryClient.invalidateQueries({ queryKey: [AREA_KEYS.blocks] });
        },
    });
};
