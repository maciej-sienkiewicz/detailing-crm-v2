import { useMutation, useQueryClient } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';
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
