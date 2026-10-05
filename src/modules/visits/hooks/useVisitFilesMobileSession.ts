// src/modules/visits/hooks/useVisitFilesMobileSession.ts
//
// „Dodaj plik" → kod QR: zdjęcia do otwartej wizyty z telefonu, także takiego, który
// nie jest zalogowany do aplikacji.
//
// Sesja mieszka w widoku wizyty, nie w oknie z kodem: operator skanuje kod, zamyka
// okno i idzie do samochodu - a zdjęcia mają dalej pojawiać się w galerii. Serwer
// dopisuje je do wizyty sam; tutaj tylko odświeżamy listę, gdy telefon da znać.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCheckinSocket } from '@/modules/checkin/hooks/useCheckinSocket';
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
    /** Otwiera sesję; `rotate` unieważnia poprzedni kod. */
    start: (rotate: boolean) => Promise<void>;
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

    const hasSession = secondsLeft > 0;
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
        start,
    };
};
