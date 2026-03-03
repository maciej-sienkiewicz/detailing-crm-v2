import { useMutation, useQueryClient } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';
import { INSTAGRAM_PROFILES_KEY } from './useInstagramProfiles';

export const useAddProfile = () => {
    const queryClient = useQueryClient();

    const { mutate, isPending, isError, reset } = useMutation({
        mutationFn: (username: string) => instagramApi.addProfile(username),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [INSTAGRAM_PROFILES_KEY] });
        },
    });

    return { addProfile: mutate, isAdding: isPending, isError, reset };
};
