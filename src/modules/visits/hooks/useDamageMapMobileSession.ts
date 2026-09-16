// src/modules/visits/hooks/useDamageMapMobileSession.ts
//
// Sesja „telefon jako narzędzie do mapy uszkodzeń", trzymana przez CAŁY czas życia
// okna aktualizacji uszkodzeń.
//
// Dwie decyzje, obie wymuszone przez błędy z produkcji:
//
// 1. Sesja mieszka w stanie OKNA, nie panelu z kodem QR. Panel jest zakładką w oknie
//    wyboru zdjęcia — operator skanuje kod, zamyka ten wybór i idzie do samochodu,
//    a wtedy panel się odmontowuje. Gdy sesja siedziała w panelu, gniazdo WebSocket
//    znikało dokładnie w momencie, w którym telefon zaczynał być potrzebny.
//
// 2. Uzgadnianie stanu robi JEDNO wywołanie serwera, a nie „przenieś zdjęcia" +
//    „przetłumacz identyfikatory u siebie". Telefon przy dodaniu zdjęcia wysyła DWA
//    zdarzenia (wysłano zdjęcie, zapisano punkty); przy dwóch krokach oba odpalały
//    przenoszenie równolegle, co dawało dwa wiersze zdjęcia wizyty (zdjęcie widoczne
//    PODWÓJNIE na liście „Istniejące") i tłumaczenie czytające pustą jeszcze tablicę
//    mapowań (zdjęcie WYPADAŁO z punktu). Teraz tłumaczy serwer, idempotentnie.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCheckinSocket } from '@/modules/checkin/hooks/useCheckinSocket';
import type { DamagePoint } from '@/modules/checkin/types';
import { visitApi } from '../api/visitApi';

export interface DamageMapMobileSession {
    /** null, dopóki nikt nie poprosił o kod. */
    qrUrl: string | null;
    secondsLeft: number;
    isExpired: boolean;
    isStarting: boolean;
    error: string | null;
    /** Telefon dał znak życia (wysłał zdjęcie albo zapisał punkty). */
    phoneSeen: boolean;
    /** Otwiera sesję; `rotate` unieważnia poprzedni kod. */
    start: (rotate: boolean) => Promise<void>;
}

interface Options {
    visitId: string;
    /** Aktualne punkty edytora — zasiewamy nimi sesję przy wydaniu kodu. */
    points: DamagePoint[];
    vehicleType: string;
    /** Punkty przyszły z telefonu, już przetłumaczone przez serwer. */
    onPointsFromPhone: (points: DamagePoint[], vehicleType: string | null) => void;
    /** Zdjęcia z telefonu weszły do galerii wizyty — odśwież listę zdjęć. */
    onPhotosClaimed: () => void;
}

export const useDamageMapMobileSession = ({
    visitId,
    points,
    vehicleType,
    onPointsFromPhone,
    onPhotosClaimed,
}: Options): DamageMapMobileSession => {
    const [token, setToken] = useState<string | null>(null);
    const [checkinId, setCheckinId] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [phoneSeen, setPhoneSeen] = useState(false);

    // Zasiew wymaga AKTUALNYCH punktów, ale token nie ma się przeładowywać przy
    // każdym postawionym punkcie — refy trzymają najnowsze bez wchodzenia w zależności.
    const pointsRef = useRef(points);
    const vehicleTypeRef = useRef(vehicleType);
    const onPointsFromPhoneRef = useRef(onPointsFromPhone);
    const onPhotosClaimedRef = useRef(onPhotosClaimed);
    useEffect(() => {
        pointsRef.current = points;
        vehicleTypeRef.current = vehicleType;
        onPointsFromPhoneRef.current = onPointsFromPhone;
        onPhotosClaimedRef.current = onPhotosClaimed;
    });

    const start = useCallback(async (rotate: boolean) => {
        setIsStarting(true);
        setError(null);
        try {
            const data = await visitApi.startDamageMapMobileSession(visitId, {
                damagePoints: pointsRef.current,
                vehicleType: vehicleTypeRef.current,
                rotate,
            });
            setToken(data.token);
            setCheckinId(data.checkinId);
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

    /*
     * Uzgadnianie jest SZEREGOWANE. Telefon wysyła dwa zdarzenia na jedno zdjęcie,
     * a dwa równoległe uzgodnienia to dokładnie ten wyścig, który dublował zdjęcia.
     * `inFlight` trzyma trwające wywołanie, `pending` pamięta, że w jego trakcie
     * przyszło kolejne zdarzenie — po zakończeniu lecimy jeszcze raz, żeby nie
     * zgubić ostatniej zmiany.
     */
    const inFlight = useRef<Promise<void> | null>(null);
    const pending = useRef(false);

    const runSync = useCallback(async (): Promise<void> => {
        try {
            const state = await visitApi.syncDamageMapMobileSession(visitId);
            if (!state.active) return;
            onPointsFromPhoneRef.current(state.damagePoints, state.vehicleType);
            // Zdjęcia mogły wejść do galerii wizyty — lista „Istniejące" i galeria
            // pod oknem muszą je zobaczyć.
            onPhotosClaimedRef.current();
        } catch {
            /*
             * Cicho: kolejne zdarzenie z telefonu spróbuje ponownie, a operator nie
             * ma tu żadnej decyzji do podjęcia. Alarmowanie przy każdym mignięciu
             * sieci byłoby szumem nad otwartym edytorem.
             */
        }
    }, [visitId]);

    const sync = useCallback((): Promise<void> => {
        if (inFlight.current) {
            pending.current = true;
            return inFlight.current;
        }
        const run = (async () => {
            await runSync();
            while (pending.current) {
                pending.current = false;
                await runSync();
            }
            inFlight.current = null;
        })();
        inFlight.current = run;
        return run;
    }, [runSync]);

    const handleEventFromPhone = useCallback(() => {
        setPhoneSeen(true);
        void sync();
    }, [sync]);

    useCheckinSocket({
        checkinId,
        onPhotoUploaded: handleEventFromPhone,
        onDamageUpdated: handleEventFromPhone,
        enabled: !!checkinId && hasSession,
    });

    return {
        qrUrl: token ? `${window.location.origin}/m/upload?t=${token}` : null,
        secondsLeft,
        isExpired: token !== null && secondsLeft === 0,
        isStarting,
        error,
        phoneSeen,
        start,
    };
};
