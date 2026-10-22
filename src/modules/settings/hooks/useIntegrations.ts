import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateAccounts } from '@/modules/competition-monitoring/hooks/useAccounts';
import { integrationsApi, type IntegrationKind } from '../api/integrationsApi';

export const INTEGRATIONS_KEY = ['settings', 'integrations'] as const;

export const useIntegrations = () =>
    useQuery({ queryKey: INTEGRATIONS_KEY, queryFn: integrationsApi.list, staleTime: 60_000 });

export const useDisconnectIntegration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (kind: IntegrationKind) => integrationsApi.disconnect(kind),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INTEGRATIONS_KEY });
            // To samo połączenie pokazuje moduł Instagram (Moje konta, Przegląd) - po odłączeniu
            // tutaj nie może tam dalej wisieć jako połączone.
            invalidateAccounts(queryClient);
        },
    });
};
