import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { rolePreviewApi } from './rolePreviewApi';
import { openRolePreview, type RolePreviewInput } from './openRolePreview';

const CONFIG_KEY = ['role-preview', 'config'] as const;

/** Komunikat z odpowiedzi serwera albo z samego błędu. */
function messageOf(error: unknown): string {
    const serverMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    if (serverMessage) return serverMessage;
    return error instanceof Error ? error.message : 'Spróbuj ponownie za chwilę.';
}

/**
 * „Przejdź do podglądu roli": dostępność (podgląd włączony i skonfigurowany) i otwarcie.
 * Przycisk pokazuje się tylko wtedy, gdy podgląd jest dostępny.
 */
export function useRolePreview() {
    const { showError } = useToast();
    const [opening, setOpening] = useState(false);
    const { data: config } = useQuery({
        queryKey: CONFIG_KEY,
        queryFn: rolePreviewApi.getConfig,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    const previewBaseUrl = config?.enabled ? config.previewBaseUrl : null;

    const open = useCallback((input: RolePreviewInput) => {
        if (!previewBaseUrl || opening) return;
        setOpening(true);
        openRolePreview(previewBaseUrl, input)
            .catch(error => showError('Nie udało się otworzyć podglądu roli', messageOf(error)))
            .finally(() => setOpening(false));
    }, [previewBaseUrl, opening, showError]);

    return { available: !!previewBaseUrl, opening, open };
}
