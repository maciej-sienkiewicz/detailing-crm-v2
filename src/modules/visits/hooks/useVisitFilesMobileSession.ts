// src/modules/visits/hooks/useVisitFilesMobileSession.ts
//
// „Dodaj plik" → kod QR: zdjęcia do otwartej wizyty z telefonu, także takiego, który
// nie jest zalogowany do aplikacji.
//
// Sesja kończy się razem z oknem: „Gotowe" albo zamknięcie okna (i wyjście z wizyty)
// kończy ją także na telefonie, który pokazuje wtedy „Zakończono na komputerze"
// zamiast przyjmować zdjęcia, na które nikt już nie czeka. Serwer dopisuje zdjęcia
// do wizyty sam; tutaj odświeżamy listę, gdy telefon da znać.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCheckinSocket } from '@/modules/checkin/hooks/useCheckinSocket';
import { usePhoneSessionDone } from '@/modules/checkin/hooks/usePhoneSessionStatus';
import { checkinApi } from '@/modules/checkin/api/checkinApi';
import { visitApi } from '../api/visitApi';
import { visitPhotosQueryKey } from './index';

export interface VisitFilesMobileSession {
    /** null, dopóki nikt nie poprosił o kod. */
    qrUrl: string | null;
    secondsLeft: number;
    isExpired: boolean;
    isStarting: boolean;
    error: string | null;
    /** Ile zdjęć przyszło z telefonu w tej sesji okna. */
    received: number;
    /** Telefon kliknął „Gotowe". */
    phoneDone: boolean;
    /** Otwiera sesję; `rotate` unieważnia poprzedni kod. */
    start: (rotate: boolean) => Promise<void>;
    /** Kończy sesję także na telefonie. Następne otwarcie okna da nowy kod. */
    end: () => void;
}

export const useVisitFilesMobileSession = (visitId: string | undefined): VisitFilesMobileSession => {
    const queryClient = useQueryClient();
    const [token, setToken] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [received, setReceived] = useState(0);

    const start = useCallback(async (rotate: boolean) => {
        if (!visitId) return;
        setIsStarting(true);
        setError(null);
        try {
            const data = await visitApi.startVisitFilesMobileSession(visitId, rotate);
            setToken(data.token);
            setSessionId(data.checkinId);
            setSecondsLeft(Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nie udało się wygenerować kodu QR');
        } finally {
            setIsStarting(false);
        }
    }, [visitId]);

    const end = useCallback(() => {
        if (token) void checkinApi.endMobileSession(token, 'FINISHED').catch(() => {});
        setToken(null);
        setSessionId(null);
        setSecondsLeft(0);
        setReceived(0);
        setError(null);
    }, [token]);

    // Wyjście z wizyty też kończy sesję - inaczej telefon zostałby z otwartą stroną.
    const tokenRef = useRef(token);
    useEffect(() => { tokenRef.current = token; }, [token]);
    useEffect(() => () => {
        if (tokenRef.current) void checkinApi.endMobileSession(tokenRef.current, 'FINISHED').catch(() => {});
    }, []);

    const hasSession = secondsLeft > 0;
    const phoneDone = usePhoneSessionDone(token, hasSession);
    useEffect(() => {
        if (!hasSession) return;
        const id = setInterval(() => setSecondsLeft(prev => Math.max(0, prev - 1)), 1000);
        return () => clearInterval(id);
    }, [hasSession]);

    const visitIdRef = useRef(visitId);
    useEffect(() => { visitIdRef.current = visitId; });

    const handlePhotoUploaded = useCallback(() => {
        setReceived(n => n + 1);
        // Zdjęcie jest już w wizycie (serwer zapisuje je przed wysłaniem zdarzenia).
        if (visitIdRef.current) {
            void queryClient.invalidateQueries({ queryKey: visitPhotosQueryKey(visitIdRef.current) });
        }
    }, [queryClient]);

    useCheckinSocket({
        checkinId: sessionId,
        onPhotoUploaded: handlePhotoUploaded,
        enabled: !!sessionId && hasSession,
    });

    return {
        qrUrl: token ? `${window.location.origin}/m/upload?t=${token}` : null,
        secondsLeft,
        isExpired: token !== null && secondsLeft === 0,
        isStarting,
        error,
        received,
        phoneDone,
        start,
        end,
    };
};
