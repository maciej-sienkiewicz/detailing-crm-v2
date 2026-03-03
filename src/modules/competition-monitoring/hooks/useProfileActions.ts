import { useMutation, useQueryClient } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';
import { INSTAGRAM_PROFILES_KEY } from './useInstagramProfiles';

export const useProfileActions = () => {
    const queryClient = useQueryClient();

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: [INSTAGRAM_PROFILES_KEY] });

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

    return {
        approveProfile: approve.mutate,
        isApproving: approve.isPending,
        rejectProfile: reject.mutate,
        isRejecting: reject.isPending,
        removeProfile: remove.mutate,
        isRemoving: remove.isPending,
    };
};
