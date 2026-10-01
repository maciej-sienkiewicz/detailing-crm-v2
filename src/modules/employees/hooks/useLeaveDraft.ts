// src/modules/employees/hooks/useLeaveDraft.ts
//
// Szkic wniosku urlopowego w otwartym oknie - wspólny dla wniosku pracownika
// (samoobsługa) i urlopu dodawanego przez administratora (ON_BEHALF).
//
// Szkic powstaje na serwerze, zanim ktokolwiek podpisze, bo podpis dotyczy dokładnie
// tych bajtów PDF, których skrót dał backend (WYSIWYS). Szkic bez podpisu nie jest
// wnioskiem: nie trafia do kolejki ani do kalendarza, a porzucony backend usuwa po
// 24 h. Mimo to okno nie zostawia po sobie więcej niż JEDNEGO szkicu: inne dane
// tworzą nowy szkic i porzucają stary, zamknięcie bez podpisu - też.

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { CreateLeaveRequestResponse, LeaveRequestDetail, SigningSession } from '../types';

export interface LeaveDraft {
    request: LeaveRequestDetail;
    session: SigningSession;
    /** Dane, z których powstał szkic - inne dane = nowy szkic. */
    payloadKey: string;
}

export interface LeaveDraftEndpoints<P> {
    create: (payload: P) => Promise<CreateLeaveRequestResponse>;
    /** Porzucenie szkicu (withdraw u pracownika, discard u administratora). */
    discard: (id: string) => Promise<unknown>;
    /** Nowy jednorazowy challenge dla tego samego szkicu - po 409. */
    newSession: (id: string) => Promise<SigningSession>;
}

/** Porzucenie „w tle": nieudane nic nie psuje, backend i tak sprząta szkice po 24 h. */
function discardQuietly(discard: (id: string) => Promise<unknown>, draft: LeaveDraft | null) {
    if (!draft) return;
    void discard(draft.request.id).catch(() => undefined);
}

/** `endpoints` ma być stały (obiekt na poziomie modułu): sprzątanie przy odmontowaniu bierze ten z montażu. */
export function useLeaveDraft<P>(endpoints: LeaveDraftEndpoints<P>) {
    const [draft, setDraftState] = useState<LeaveDraft | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    // Ref, a nie stan: sprzątanie przy odmontowaniu widzi ostatni szkic, a nie ten
    // z chwili zamontowania efektu.
    const draftRef = useRef<LeaveDraft | null>(null);
    const settledRef = useRef(false);

    const setDraft = (next: LeaveDraft | null) => {
        draftRef.current = next;
        setDraftState(next);
    };

    const create = useMutation({ mutationFn: (payload: P) => endpoints.create(payload) });

    // Szkic, który nie został podpisany, nie może wisieć po zamknięciu okna.
    const { discard } = endpoints;
    useEffect(() => () => {
        if (!settledRef.current) discardQuietly(discard, draftRef.current);
    }, [discard]);

    /**
     * Szkic dla tych danych: ten sam, gdy dane się nie zmieniły (bez nowego żądania
     * i bez nowego dokumentu), nowy - gdy się zmieniły, a stary idzie do kosza.
     */
    const prepare = (
        payload: P,
        handlers: { onReady: (draft: LeaveDraft, fresh: boolean) => void; onError: (error: unknown) => void },
    ) => {
        const key = JSON.stringify(payload);
        const current = draftRef.current;
        if (current && current.payloadKey === key) { handlers.onReady(current, false); return; }
        create.mutate(payload, {
            onSuccess: ({ request, session }) => {
                discardQuietly(endpoints.discard, draftRef.current);
                const next = { request, session, payloadKey: key };
                setDraft(next);
                handlers.onReady(next, true);
            },
            onError: handlers.onError,
        });
    };

    /** 409: dokument albo challenge się zmienił - nowa sesja dla tego samego szkicu. */
    const refreshSession = async (): Promise<boolean> => {
        const current = draftRef.current;
        if (!current) return false;
        setRefreshing(true);
        try {
            const session = await endpoints.newSession(current.request.id);
            setDraft({ ...current, session });
            return true;
        } catch {
            return false;
        } finally {
            setRefreshing(false);
        }
    };

    /** Podpisany szkic jest już wnioskiem - nie wolno go porzucić przy zamknięciu. */
    const settle = () => { settledRef.current = true; };

    /**
     * Zamknięcie okna: szkic idzie do kosza od razu, a nie dopiero przy odmontowaniu -
     * okno nie wie, czy rodzic je odmontuje (i kiedy).
     */
    const abandon = () => {
        if (settledRef.current) return;
        discardQuietly(endpoints.discard, draftRef.current);
        setDraft(null);
    };

    return {
        draft,
        prepare,
        isPreparing: create.isPending,
        refreshSession,
        refreshing,
        settle,
        abandon,
    };
}
