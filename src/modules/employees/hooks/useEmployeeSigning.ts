// src/modules/employees/hooks/useEmployeeSigning.ts
//
// Stan kroku „podpis pracownika" pod zatwierdzonym urlopem (EmployeeSigningBody): teraz
// na tym urządzeniu, na tablecie, SMS-em albo bez podpisu.

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SignaturePadHandle } from '@/common/components/SignaturePad';
import { backgroundRequest } from '@/core/backgroundRequest';
import { useCapability } from '@/modules/subscription';
import { useSignatureRequestsSocket } from '@/modules/checkin/hooks/useSignatureRequestsSocket';
import { leaveApiError, leaveRequestsApi } from '../api/leaveRequestsApi';
import { LEAVE_REQUESTS_KEY } from './useLeaveRequests';
import { isAwaitingSignature } from './useAttendanceRemoteSigning';
import type { LeaveRequestDetail } from '../types';

export type EmployeeSignMethod = 'NOW' | 'TABLET' | 'SMS' | 'NONE';

const POLL_MS = 5_000;

const signatureKey = (id: string) => [...LEAVE_REQUESTS_KEY, id, 'remote-signature'] as const;

/**
 * Stan i akcje kroku podpisu. Okno składa z tego treść ([EmployeeSigningBody]) i jeden
 * wypełniony przycisk w stopce ([primary]).
 */
export function useEmployeeSigning(request: LeaveRequestDetail, onSigned: (updated: LeaveRequestDetail) => void) {
    const queryClient = useQueryClient();
    const [method, setMethod] = useState<EmployeeSignMethod>('NOW');
    const [phone, setPhone] = useState<string | null>(null);
    const [tabletId, setTabletId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const padRef = useRef<SignaturePadHandle>(null);
    const [hasInk, setHasInk] = useState(false);
    const [declared, setDeclared] = useState(false);
    const [showDocument, setShowDocument] = useState(false);
    const signedAlready = !!request.employeeSignedAt;

    const options = useQuery({
        queryKey: [...LEAVE_REQUESTS_KEY, request.id, 'signing-options'],
        queryFn: () => leaveRequestsApi.signingOptions(request.id),
        enabled: !signedAlready,
        retry: false,
    });
    const tablets = options.data?.tablets ?? [];
    // Numer z karty pracownika jako punkt wyjścia - dopóki ktoś go nie poprawi.
    const phoneValue = phone ?? options.data?.employeePhone ?? '';
    const effectiveTablet = tabletId ?? (tablets.length === 1 ? tablets[0].tabletId : null);

    const tabletCap = useCapability('SIGNATURE_LOCAL');
    const smsCap = useCapability('SIGNATURE_REMOTE_REQUEST');
    const blockers: Record<'TABLET' | 'SMS', string | null> = {
        TABLET: !tabletCap.enabled ? tabletCap.lockReason ?? 'Wymaga modułu Podpisy elektroniczne'
            : !options.isLoading && tablets.length === 0 ? 'Brak sparowanego tabletu' : null,
        SMS: !smsCap.enabled ? smsCap.lockReason ?? 'Wymaga modułów Podpisy elektroniczne i Automatyzacja kontaktu' : null,
    };

    const key = signatureKey(request.id);
    const latest = useQuery({
        queryKey: key,
        queryFn: context => leaveRequestsApi.latestSignature(request.id, backgroundRequest(context)),
        enabled: !signedAlready,
        refetchInterval: query => (isAwaitingSignature(query.state.data) ? POLL_MS : false),
    });
    const awaiting = isAwaitingSignature(latest.data) ? latest.data! : null;
    const refresh = () => void queryClient.invalidateQueries({ queryKey: key });
    useSignatureRequestsSocket(awaiting ? [awaiting.id] : [], { onEvent: refresh, onReconnect: refresh });

    // Podpis z tabletu albo telefonu wrócił - wniosek ma już podpis pracownika.
    const completed = latest.data?.status === 'COMPLETED';
    useEffect(() => {
        if (!completed) return;
        void leaveRequestsApi.get(request.id).then(onSigned).catch(() => undefined);
        void queryClient.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [completed]);

    // ── Na tym urządzeniu: sesja podpisu i dokument, który pracownik podpisuje ──
    const session = useQuery({
        queryKey: [...LEAVE_REQUESTS_KEY, request.id, 'employee-session'],
        queryFn: () => leaveRequestsApi.employeeSigningSession(request.id),
        enabled: method === 'NOW' && !signedAlready,
        retry: false,
        staleTime: Infinity,
        gcTime: 0,
    });
    const documentQuery = useQuery({
        queryKey: [...LEAVE_REQUESTS_KEY, request.id, 'document', session.data?.challenge ?? ''],
        queryFn: () => leaveRequestsApi.document(request.id),
        enabled: method === 'NOW' && showDocument && !!session.data,
        retry: false,
        staleTime: Infinity,
        gcTime: 0,
    });

    const signNow = useMutation({
        mutationFn: () => leaveRequestsApi.employeeSignature(request.id, {
            signatureImageBase64: padRef.current?.toPngBase64() ?? '',
            documentSha256: session.data!.documentSha256,
            challenge: session.data!.challenge,
            declarationAccepted: true,
        }),
        onSuccess: updated => {
            void queryClient.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY });
            onSigned(updated);
        },
        onError: error => {
            const { status, message } = leaveApiError(error);
            if (status === 409) {
                // Nowy token i ten sam dokument - pad od nowa.
                padRef.current?.clear();
                setDeclared(false);
                void session.refetch();
                setNotice('Dokument został odświeżony. Podpisz jeszcze raz.');
                return;
            }
            setNotice(message ?? 'Nie udało się zapisać podpisu. Spróbuj ponownie.');
        },
    });

    const send = useMutation({
        mutationFn: () => leaveRequestsApi.requestSignature(request.id, method === 'TABLET'
            ? { channel: 'TABLET', tabletId: effectiveTablet }
            : { channel: 'SMS', phone: phoneValue.trim() || null }),
        onSuccess: sent => { setNotice(null); queryClient.setQueryData(key, sent); },
        onError: error => setNotice(leaveApiError(error).message ?? 'Nie udało się wysłać prośby o podpis.'),
    });

    const cancel = useMutation({
        mutationFn: () => leaveRequestsApi.cancelSignature(request.id),
        onSettled: refresh,
    });

    const busy = signNow.isPending || send.isPending;
    const primary: { title: string; sub: string; disabled: boolean; run: () => void } | null =
        awaiting || signedAlready ? null
            : method === 'NOW' ? {
                title: signNow.isPending ? 'Zapisywanie podpisu…' : 'Podpisz',
                sub: 'pracownik podpisuje na tym ekranie',
                disabled: busy || !hasInk || !declared || !session.data,
                run: () => { setNotice(null); signNow.mutate(); },
            }
                : method === 'TABLET' ? {
                    title: send.isPending ? 'Wysyłanie…' : 'Wyślij na tablet',
                    sub: 'pracownik podpisze na tablecie',
                    disabled: busy || !!blockers.TABLET || (tablets.length > 1 && !effectiveTablet),
                    run: () => send.mutate(),
                }
                    : method === 'SMS' ? {
                        title: send.isPending ? 'Wysyłanie…' : 'Wyślij SMS',
                        sub: 'z linkiem do podpisu',
                        disabled: busy || !!blockers.SMS || phoneValue.trim().length < 9,
                        run: () => send.mutate(),
                    }
                        : null;

    return {
        request, method, setMethod: (m: EmployeeSignMethod) => { setNotice(null); setMethod(m); },
        tablets, effectiveTablet, setTabletId, phoneValue, setPhone, blockers,
        padRef, setHasInk, declared, setDeclared, showDocument, setShowDocument, session, documentQuery,
        awaiting, latest: latest.data ?? null, cancel, notice, primary, signedAlready,
    };
}

export type EmployeeSigning = ReturnType<typeof useEmployeeSigning>;
