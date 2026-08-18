import { useMutation, useQueryClient } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';
import { INSTAGRAM_PROFILES_KEY } from './useInstagramProfiles';
import { invalidateAnalytics } from './useAnalytics';

export const useProfileActions = () => {
    const queryClient = useQueryClient();

    // Zmiany w profilach unieważniają też analitykę: ranking i benchmark
    // muszą odzwierciedlać aktualny koszyk profili
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: [INSTAGRAM_PROFILES_KEY] });
        invalidateAnalytics(queryClient);
    };

    const approve = useMutation({
        mutationFn: (id: string) => instagramApi.approveProfile(id),
        onSuccess: invalidate,
    });

    const reject = useMutation({
        mutationFn: (id: string) => instagramApi.rejectProfile(id),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (id: string) => instagramApi.removeProfile(id),
        onSuccess: invalidate,
    });

    const markSelf = useMutation({
        mutationFn: ({ id, isSelf }: { id: string; isSelf: boolean }) =>
            instagramApi.markSelf(id, isSelf),
        onSuccess: invalidate,
    });

    return {
        approveProfile: approve.mutate,
        isApproving: approve.isPending,
        rejectProfile: reject.mutate,
        isRejecting: reject.isPending,
        removeProfile: remove.mutate,
        isRemoving: remove.isPending,
        markSelf: markSelf.mutate,
        isMarkingSelf: markSelf.isPending,
    };
};
