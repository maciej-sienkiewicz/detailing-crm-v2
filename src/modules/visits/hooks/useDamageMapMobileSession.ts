// src/modules/visits/hooks/useDamageMapMobileSession.ts
//
// Sesja „telefon jako narzędzie do mapy uszkodzeń", trzymana przez CAŁY czas życia
// okna aktualizacji uszkodzeń.
//
// Pierwsza wersja trzymała ją w panelu z kodem QR — a ten panel jest zakładką w
// oknie wyboru zdjęcia, otwieranym z konkretnego punktu. Operator skanował kod,
// zamykał wybór zdjęcia i szedł do samochodu; w tym momencie panel się odmontowywał,
// gniazdo WebSocket znikało i nic z telefonu już nie docierało. Zdjęcie lądowało na
// serwerze i w galerii wizyty, ale okno z mapą nigdy się o nim nie dowiadywało.
//
// Dlatego sesja mieszka tutaj, w stanie OKNA. Panel tylko ją pokazuje.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCheckinSocket } from '@/modules/checkin/hooks/useCheckinSocket';
import type { CheckinDamageUpdatedEvent, DamagePoint } from '@/modules/checkin/types';
import { visitApi } from '../api/visitApi';
import type { ClaimedMobilePhoto } from '../types';

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
    /** Identyfikatory zdjęć, które są już zdjęciami wizyty. */
    knownPhotoIds: string[];
    onPointsFromPhone: (points: DamagePoint[], vehicleType: string | null) => void;
    onPhotosClaimed: (photos: ClaimedMobilePhoto[]) => void;
}

export const useDamageMapMobileSession = ({
    visitId,
    points,
    vehicleType,
    knownPhotoIds,
    onPointsFromPhone,
    onPhotosClaimed,
}: Options): DamageMapMobileSession => {
    const [token, setToken] = useState<string | null>(null);
    const [checkinId, setCheckinId] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [phoneSeen, setPhoneSeen] = useState(false);

    /*
     * Tablica „identyfikator tymczasowy → zdjęcie wizyty", trzymana przez całe życie
     * sesji. Telefon ma własny stan i przy każdym zapisie przysyła SWOJE, tymczasowe
     * identyfikatory — także po tym, jak przenieśliśmy zdjęcie do galerii wizyty i
     * obiekt tymczasowy przestał istnieć. Bez tej tablicy drugi zapis z telefonu
     * wstawiałby wskaźniki, których nic już nie rozwiązuje.
     */
    const photoIdRemap = useRef<Map<string, string>>(new Map());
    /** Adresy miniatur ze świeżo przeniesionych zdjęć — zanim dojdzie odświeżona lista zdjęć wizyty. */
    const claimedThumbnails = useRef<Map<string, string>>(new Map());

    // Zasiew wymaga AKTUALNYCH punktów, ale token nie ma się przeładowywać przy
    // każdym postawionym punkcie — refy trzymają najnowsze bez wchodzenia w zależności.
    const pointsRef = useRef(points);
    const vehicleTypeRef = useRef(vehicleType);
    const knownPhotoIdsRef = useRef(knownPhotoIds);
    const onPointsFromPhoneRef = useRef(onPointsFromPhone);
    const onPhotosClaimedRef = useRef(onPhotosClaimed);
    useEffect(() => {
        pointsRef.current = points;
        vehicleTypeRef.current = vehicleType;
        knownPhotoIdsRef.current = knownPhotoIds;
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

    /**
     * Przenosi świeże zdjęcia z telefonu do galerii wizyty i zapamiętuje mapowanie
     * identyfikatorów oraz adresy miniatur.
     */
    const claimAndRemap = useCallback(async () => {
        try {
            const { photos } = await visitApi.claimDamageMapQrPhotos(visitId);
            if (photos.length === 0) return;
            photos.forEach(p => {
                photoIdRemap.current.set(p.temporaryPhotoId, p.photoId);
                if (p.thumbnailUrl) claimedThumbnails.current.set(p.photoId, p.thumbnailUrl);
            });
            onPhotosClaimedRef.current(photos);
        } catch {
            /*
             * Cicho: przeniesienie zdjęć jest krokiem pomocniczym. Punkty z telefonu
             * i tak wejdą do edytora, zdjęcie bez rozwiązanego identyfikatora zostanie
             * pominięte, a kolejne zdarzenie spróbuje ponownie.
             */
        }
    }, [visitId]);

    const handlePhotoUploaded = useCallback(() => {
        setPhoneSeen(true);
        void claimAndRemap();
    }, [claimAndRemap]);

    const handleDamageUpdated = useCallback(async (event: CheckinDamageUpdatedEvent) => {
        setPhoneSeen(true);
        // Najpierw przenieś zdjęcia, potem podmieniaj wskaźniki — inaczej punkt
        // przyszedłby ze wskaźnikiem, którego tablica jeszcze nie zna.
        await claimAndRemap();

        const known = new Set(knownPhotoIdsRef.current);
        const remapped: DamagePoint[] = event.damagePoints.map(point => ({
            ...point,
            photos: (point.photos ?? [])
                .map(photo => {
                    // 1. Zdjęcie zrobione telefonem, już przeniesione do wizyty.
                    const resolved = photoIdRemap.current.get(photo.photoId);
                    if (resolved) {
                        return {
                            ...photo,
                            photoId: resolved,
                            // Adres z odpowiedzi przeniesienia, żeby kafelek pokazał
                            // zdjęcie OD RAZU — nie dopiero po odświeżeniu listy zdjęć wizyty.
                            thumbnailUrl: claimedThumbnails.current.get(resolved),
                        };
                    }
                    // 2. Zdjęcie przypięte jeszcze przed sesją: telefon oddaje je z tym
                    //    samym identyfikatorem i tak ma zostać. Adres znajdzie edytor
                    //    po identyfikatorze w liście zdjęć wizyty.
                    if (known.has(photo.photoId)) return { ...photo, thumbnailUrl: undefined };
                    /*
                     * 3. Nierozwiązane: świeże zdjęcie z telefonu, którego przeniesienie
                     *    jeszcze nie doszło. Pomijamy zamiast wstawiać martwy wskaźnik —
                     *    kolejne zdarzenie przyniesie je z rozwiązanym identyfikatorem.
                     */
                    return null;
                })
                .filter((photo): photo is NonNullable<typeof photo> => photo !== null),
        }));

        onPointsFromPhoneRef.current(remapped, event.vehicleType ?? null);
    }, [claimAndRemap]);

    useCheckinSocket({
        checkinId,
        onPhotoUploaded: handlePhotoUploaded,
        onDamageUpdated: handleDamageUpdated,
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
