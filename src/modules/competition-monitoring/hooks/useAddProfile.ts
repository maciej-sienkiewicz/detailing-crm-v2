import { useMutation, useQueryClient } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';
import type { InstagramProfile } from '../types';
import { INSTAGRAM_PROFILES_KEY } from './useInstagramProfiles';
import { invalidateAnalytics } from './useAnalytics';

export const useAddProfile = () => {
    const queryClient = useQueryClient();

    const { mutate, isPending, isError, reset } = useMutation({
        mutationFn: ({ username }: { username: string }) => instagramApi.addProfile(username),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [INSTAGRAM_PROFILES_KEY] });
            // Kierownik i właściciel dodają profil od razu jako aktywny - Konkurencja
            // i Przegląd muszą go zobaczyć bez odświeżania strony.
            invalidateAnalytics(queryClient);
        },
    });

    return { addProfile: mutate, isAdding: isPending, isError, reset };
};

/**
 * „Dodaj swój profil" w jednym kroku. Dawniej trzeba było dodać własne konto jak
 * konkurenta, a potem znaleźć przy nim gwiazdkę „To mój profil" - właściciele nie
 * wiedzieli, że tak się to robi. Gdy profil już jest na liście, tylko go oznaczamy
 * (drugie dodanie skończyłoby się błędem „już obserwujesz").
 */
export const useAddSelfProfile = (profiles: InstagramProfile[]) => {
    const queryClient = useQueryClient();

    const { mutate, isPending, isError, reset } = useMutation({
        mutationFn: async ({ username }: { username: string }) => {
            const existing = profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
            const id = existing ? existing.id : (await instagramApi.addProfile(username)).id;
            await instagramApi.markSelf(id, true);
        },
        onSettled: () => {
            // Także po błędzie: dodanie mogło się udać, a samo oznaczenie nie.
            queryClient.invalidateQueries({ queryKey: [INSTAGRAM_PROFILES_KEY] });
            invalidateAnalytics(queryClient);
        },
    });

    return { addSelf: mutate, isAddingSelf: isPending, isSelfError: isError, resetSelf: reset };
};
