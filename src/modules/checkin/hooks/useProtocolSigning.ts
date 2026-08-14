import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { tabletApi } from '../api/tabletApi';
import { useSignatureRequestsSocket } from './useSignatureRequestsSocket';
import type { SignatureRequestSocketEvent } from './useSignatureRequestsSocket';

export type SigningChannel = 'tablet' | 'sms';

export type SigningState =
    | { phase: 'sending'; channel: SigningChannel }
    | { phase: 'waiting'; requestId: string; channel: SigningChannel }
    | { phase: 'signed'; requestId: string; channel?: SigningChannel }
    | { phase: 'declined'; requestId: string; channel?: SigningChannel }
    | { phase: 'failed'; requestId?: string; errorMessage?: string; channel?: SigningChannel };

const extractApiErrorMessage = (error: unknown): string | undefined => {
    const apiMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    if (apiMessage) return apiMessage;
    return error instanceof Error ? error.message : undefined;
};

interface UseProtocolSigningArgs {
    visitId: string | null;
    /** Imię i nazwisko osoby podpisującej — trafia na dokument. */
    signerName: string;
    customerPhone?: string | null;
    /** Lista tabletów pobierana tylko wtedy, gdy panel jest widoczny. */
    enabled?: boolean;
}

/**
 * Maszyneria zbierania podpisu pod protokołem — wspólna dla przyjęcia
 * i wydania pojazdu.
 *
 * Trzyma stan sesji podpisu per protokół, wysyła prośbę na tablet albo SMS-em
 * na telefon klienta i słucha wyniku po WebSockecie. Po zerwaniu połączenia
 * dopytuje o stan końcowy, bo zdarzenia z tego okna mogły przepaść.
 */
export const useProtocolSigning = ({
    visitId,
    signerName,
    customerPhone,
    enabled = true,
}: UseProtocolSigningArgs) => {
    const { showSuccess, showError } = useToast();
    const [byProtocol, setByProtocol] = useState<Record<string, SigningState>>({});

    const { data: tablets = [] } = useQuery({
        queryKey: ['tablets'],
        queryFn: tabletApi.listTablets,
        enabled,
        staleTime: 30_000,
    });

    const setState = (protocolId: string, state: SigningState) =>
        setByProtocol(prev => ({ ...prev, [protocolId]: state }));

    const reset = () => setByProtocol({});

    /** Nie startujemy nowej sesji, gdy poprzednia trwa albo już się udała. */
    const canStart = (protocolId: string) => {
        const phase = byProtocol[protocolId]?.phase;
        return phase !== 'sending' && phase !== 'waiting' && phase !== 'signed';
    };

    const sendToTablet = async (protocolId: string, tabletId: string) => {
        if (!visitId || !canStart(protocolId)) return;
        setState(protocolId, { phase: 'sending', channel: 'tablet' });
        try {
            const request = await tabletApi.requestTabletSignature(visitId, protocolId, signerName, tabletId);
            setState(protocolId, { phase: 'waiting', requestId: request.id, channel: 'tablet' });
        } catch (error) {
            const errorMessage = extractApiErrorMessage(error);
            setState(protocolId, { phase: 'failed', errorMessage, channel: 'tablet' });
            showError('Coś poszło nie tak. Spróbuj jeszcze raz.', errorMessage);
        }
    };

    const sendToPhone = async (protocolId: string) => {
        if (!visitId || !customerPhone || !canStart(protocolId)) return;
        setState(protocolId, { phase: 'sending', channel: 'sms' });
        try {
            const request = await tabletApi.requestSmsSignature(visitId, protocolId, signerName);
            setState(protocolId, { phase: 'waiting', requestId: request.id, channel: 'sms' });
            showSuccess('SMS z linkiem do podpisu został wysłany do klienta');
        } catch (error) {
            const errorMessage = extractApiErrorMessage(error);
            setState(protocolId, { phase: 'failed', errorMessage, channel: 'sms' });
            showError('Nie udało się wysłać SMS z linkiem do podpisu.', errorMessage);
        }
    };

    const awaitedRequests = useMemo(
        () =>
            Object.entries(byProtocol).flatMap(([protocolId, state]) =>
                state.phase === 'waiting' ? [{ protocolId, requestId: state.requestId }] : []
            ),
        [byProtocol]
    );

    const applyOutcome = (
        protocolId: string,
        requestId: string,
        outcome: string,
        errorMessage?: string | null
    ) => {
        // Kanał zachowujemy, żeby „Ponów" powtórzyło tą samą drogą (tablet vs SMS)
        const channel = byProtocol[protocolId]?.channel;
        switch (outcome) {
            case 'SIGNATURE_COMPLETED':
                setState(protocolId, { phase: 'signed', requestId, channel });
                showSuccess('Klient pomyślnie podpisał dokument');
                break;
            case 'SIGNATURE_DECLINED':
                setState(protocolId, { phase: 'declined', requestId, channel });
                showError('Klient odrzucił dokument. Spróbuj ponownie.');
                break;
            case 'SIGNATURE_FAILED':
            case 'SIGNATURE_EXPIRED':
                setState(protocolId, {
                    phase: 'failed',
                    requestId,
                    errorMessage: errorMessage ?? undefined,
                    channel,
                });
                showError('Coś poszło nie tak. Spróbuj jeszcze raz.', errorMessage ?? undefined);
                break;
            // SIGNATURE_REQUESTED / DISPLAYED / CANCELLED: nadal czekamy
        }
    };

    useSignatureRequestsSocket(
        awaitedRequests.map(request => request.requestId),
        {
            onEvent: (event: SignatureRequestSocketEvent) => {
                const awaited = awaitedRequests.find(request => request.requestId === event.requestId);
                if (!awaited) return;
                applyOutcome(awaited.protocolId, event.requestId, event.type, event.errorMessage);
            },
            // Zdarzenia mogły przepaść przy zerwanym połączeniu — dopytujemy o stan
            onReconnect: () => {
                awaitedRequests.forEach(async ({ protocolId, requestId }) => {
                    try {
                        const request = await tabletApi.getSignatureRequest(requestId);
                        applyOutcome(protocolId, requestId, `SIGNATURE_${request.status}`, request.failureReason);
                    } catch (error) {
                        console.error('[useProtocolSigning] Nie udało się odświeżyć stanu podpisu:', error);
                    }
                });
            },
        }
    );

    return { tablets, byProtocol, sendToTablet, sendToPhone, reset };
};
