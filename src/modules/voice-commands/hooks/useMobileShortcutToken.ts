// src/modules/voice-commands/hooks/useMobileShortcutToken.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/context/AuthContext';
import { mobileShortcutTokenApi } from '../api/mobileShortcutTokenApi';

/**
 * Klucz niesie id użytkownika: wylogowanie nie czyści cache, więc bez tego kolejna osoba
 * w tej samej karcie mogłaby zobaczyć cudzy token, zanim przyjdzie jej własny.
 */
const tokenKey = (userId: string | undefined) => ['me', 'mobile-token', userId] as const;

export const useMobileShortcutToken = ({ enabled = true }: { enabled?: boolean } = {}) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: tokenKey(user?.userId),
        queryFn: mobileShortcutTokenApi.get,
        enabled: enabled && !!user?.userId,
        // Token zmienia się tylko rotacją, a ta podmienia go w cache.
        staleTime: Infinity,
    });
};

export const useRotateMobileShortcutToken = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: mobileShortcutTokenApi.rotate,
        onSuccess: token => queryClient.setQueryData(tokenKey(user?.userId), token),
    });
};
