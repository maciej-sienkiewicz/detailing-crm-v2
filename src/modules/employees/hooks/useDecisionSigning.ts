// src/modules/employees/hooks/useDecisionSigning.ts
//
// Podpis decyzji rozpatrującego - wspólny dla okna decyzji z kolejki i dla ostatniego
// kroku urlopu dodawanego przez administratora.
//
// Odmowa też jest decyzją pracodawcy na dokumencie, więc też jest podpisana. Sesja
// podpisu jest jednorazowa i dotyczy wersji podpisanej przez pracownika: bierzemy ją,
// gdy krok podpisu robi się aktywny. Uprawnienie sprawdza backend ponownie w chwili
// decyzji: 403 odbiera prawo decyzji, 409 znaczy, że ktoś rozpatrzył wniosek pierwszy,
// albo że wniosek dalej czeka, a zmienił się dokument lub zużył challenge.

import { useEffect, useState, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SignaturePadHandle } from '@/common/components/SignaturePad';
import { profileApi } from '@/modules/profile/api/profileApi';
import { leaveApiError } from '../api/leaveRequestsApi';
import type { LeaveRequestDetail, SigningSession } from '../types';
import { useDecideLeaveRequest, useDecisionSession } from './useLeaveRequests';

export type LeaveDecision = 'approve' | 'reject';

const REFRESHED_MESSAGE = 'Dokument został odświeżony. Sprawdź go i podpisz ponownie.';

interface Options {
    requestId: string | null;
    /** Pole podpisu żyje w komponencie - hook tylko z niego czyta przy potwierdzeniu. */
    padRef: RefObject<SignaturePadHandle | null>;
    /** Krok podpisu jest na ekranie - dopiero wtedy bierzemy jednorazową sesję. */
    active: boolean;
    onDone: (decision: LeaveDecision, result: LeaveRequestDetail) => void;
    onAlreadyDecided: (message: string | null) => void;
    onForbidden: (message: string | null) => void;
    /** Świeży stan wniosku po 409 - czy dalej czeka, czy ktoś zdążył przed nami. */
    refetchDetail: () => Promise<LeaveRequestDetail | undefined>;
}

export function useDecisionSigning({ requestId, padRef, active, onDone, onAlreadyDecided, onForbidden, refetchDetail }: Options) {
    const sessionMutation = useDecisionSession();
    const decide = useDecideLeaveRequest();

    const [session, setSession] = useState<SigningSession | null>(null);
    const [hasInk, setHasInk] = useState(false);
    const [useSaved, setUseSaved] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const savedSignature = useQuery({
        queryKey: ['profile', 'signature'],
        queryFn: profileApi.getSignature,
        enabled: active,
        staleTime: 60_000,
    });
    const hasSaved = !!savedSignature.data?.hasSignature;

    const handleSessionError = (error: unknown) => {
        const { status, message } = leaveApiError(error);
        if (status === 409) { onAlreadyDecided(message); void refetchDetail(); return; }
        if (status === 403) { onForbidden(message); void refetchDetail(); return; }
        setNotice(message ?? 'Nie udało się przygotować podpisu. Spróbuj ponownie.');
    };

    const openSession = () => {
        if (!requestId) return;
        sessionMutation.mutate(requestId, { onSuccess: setSession, onError: handleSessionError });
    };

    // Raz na wejście w krok podpisu. Niewykorzystana sesja zostaje ważna, więc powrót
    // do kroku wcześniej i z powrotem nie bierze nowej.
    const { isPending: sessionPending, isError: sessionFailed } = sessionMutation;
    useEffect(() => {
        if (active && requestId && !session && !sessionPending && !sessionFailed) openSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, requestId, session]);

    const ready = !!session && (useSaved ? hasSaved : hasInk) && !decide.isPending && !sessionMutation.isPending;

    const confirm = (decision: LeaveDecision, note: string, onNoteError: (message: string) => void) => {
        if (!session || !requestId) return;
        const trimmedNote = note.trim();
        const signatureImageBase64 = useSaved ? undefined : padRef.current?.toPngBase64() ?? undefined;
        if (!useSaved && !signatureImageBase64) return;
        setNotice(null);
        decide.mutate(
            {
                id: requestId,
                decision,
                payload: {
                    ...(signatureImageBase64 ? { signatureImageBase64 } : {}),
                    useSavedSignature: useSaved,
                    documentSha256: session.documentSha256,
                    challenge: session.challenge,
                    ...(trimmedNote ? { note: trimmedNote } : {}),
                },
            },
            {
                onSuccess: result => onDone(decision, result),
                onError: async error => {
                    const { status, field, message } = leaveApiError(error);
                    if (status === 409) {
                        // Wygrała czyjaś decyzja - albo wniosek dalej czeka, a zmienił się dokument,
                        // zużył się challenge lub w tym terminie stanął już wpis (np. L4).
                        const fresh = await refetchDetail();
                        if (!fresh || fresh.status !== 'PENDING') { onAlreadyDecided(message); return; }
                        padRef.current?.clear();
                        setSession(null);
                        sessionMutation.reset();
                        setNotice(message ?? REFRESHED_MESSAGE);
                        return;
                    }
                    if (status === 403) { onForbidden(message); void refetchDetail(); return; }
                    if (field === 'note' && message) { onNoteError(message); return; }
                    setNotice(message ?? 'Nie udało się zapisać decyzji. Spróbuj ponownie.');
                },
            },
        );
    };

    return {
        session,
        hasInk,
        setHasInk,
        useSaved,
        setUseSaved,
        hasSaved,
        notice,
        /** Nie udało się wziąć sesji - ponowienie z przycisku przy komunikacie. */
        retrySession: () => { sessionMutation.reset(); setNotice(null); openSession(); },
        sessionFailed,
        ready,
        isPending: decide.isPending,
        confirm,
    };
}

export type DecisionSigning = ReturnType<typeof useDecisionSigning>;
