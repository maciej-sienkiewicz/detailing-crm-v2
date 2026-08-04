import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { idleTimeoutApi } from '../api/idleTimeoutApi';
import { useAuth } from '@/core/context/AuthContext';

const QUERY_KEY = ['idle-timeout'];

export const useIdleTimeoutSetting = () =>
    useQuery({
        queryKey: QUERY_KEY,
        queryFn: idleTimeoutApi.get,
        staleTime: 60_000,
    });

export const useSetIdleTimeout = () => {
    const queryClient = useQueryClient();
    const { setUser, user } = useAuth();

    return useMutation({
        mutationFn: idleTimeoutApi.set,
        onSuccess: (data) => {
            queryClient.setQueryData(QUERY_KEY, data);
            if (user) {
                setUser({ ...user, idleTimeoutMinutes: data.idleTimeoutMinutes });
            }
        },
    });
};
