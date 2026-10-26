import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';

const TIPS_KEY = ['me', 'tutorial-tips'] as const;

/** Widoki, na których użytkownik wybrał „Nie pokazuj więcej" (zapis na koncie, nie w przeglądarce). */
export const useDismissedTutorialViews = () =>
    useQuery({
        queryKey: TIPS_KEY,
        queryFn: async () => {
            const response = await apiClient.get<{ dismissedViews: string[] }>('/v1/me/tutorial-tips');
            return response.data.dismissedViews;
        },
        // Zmienia się tylko przez nasze własne kliknięcie - raz na sesję wystarczy.
        staleTime: Infinity,
    });

export const useDismissTutorialTip = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (view: string) => {
            await apiClient.post(`/v1/me/tutorial-tips/${encodeURIComponent(view)}/dismiss`);
        },
        // Optymistycznie: chmurka ma zniknąć od razu, nie po rundzie do serwera.
        onMutate: async (view: string) => {
            await queryClient.cancelQueries({ queryKey: TIPS_KEY });
            const previous = queryClient.getQueryData<string[]>(TIPS_KEY);
            queryClient.setQueryData<string[]>(TIPS_KEY, views => [...(views ?? []), view]);
            return { previous };
        },
        onError: (_error, _view, context) => {
            if (context?.previous) queryClient.setQueryData(TIPS_KEY, context.previous);
        },
    });
};
