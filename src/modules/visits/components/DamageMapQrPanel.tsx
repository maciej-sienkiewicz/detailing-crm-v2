// src/modules/visits/components/DamageMapQrPanel.tsx
//
// „Kod QR" w oknie aktualizacji uszkodzeń: telefon jako narzędzie do mapy OTWARTEJ
// wizyty.
//
// Nie powstał tu drugi kanał mobilny. Sesja przyjęcia jest kluczowana opaque'owym
// `checkinId`, więc backend podstawia tam identyfikator WIZYTY — telefon dostaje
// dokładnie ten sam formularz co przy przyjęciu (`/m/upload?t=…`), a stąd czytamy
// jego pracę tym samym gniazdem WebSocket.
//
// Kierunek jest jednostronny i taki ma być: telefon jest urządzeniem WEJŚCIOWYM
// otwartego okna, nie drugim edytorem. Backend zasiewa sesję aktualnymi punktami przy
// wydaniu tokena, a do mapy wizyty zapisuje wyłącznie komputer.

import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useCheckinSocket } from '@/modules/checkin/hooks/useCheckinSocket';
import type { CheckinDamageUpdatedEvent, DamagePoint } from '@/modules/checkin/types';
import { visitApi } from '../api/visitApi';
import type { ClaimedMobilePhoto } from '../types';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const QrRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;

    @media (max-width: 520px) {
        flex-direction: column;
        text-align: center;
    }
`;

const QrBox = styled.div`
    flex-shrink: 0;
    width: 148px;
    height: 148px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    background: #ffffff;
    border: 1px solid ${st.border};
    border-radius: 12px;
`;

const QrPlaceholder = styled.span`
    font-size: 12px;
    text-align: center;
    color: ${st.textMuted};
    line-height: 1.5;
`;

const QrTexts = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const QrTitle = styled.p`
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    color: ${st.text};
`;

const QrSubtitle = styled.p`
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    color: ${st.textSecondary};
`;

const StatusRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const Pill = styled.span<{ $tone: 'muted' | 'live' | 'warn' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid
        ${p => (p.$tone === 'live' ? 'rgba(16, 185, 129, 0.4)'
        : p.$tone === 'warn' ? 'rgba(245, 158, 11, 0.4)'
        : st.border)};
    background: ${p => (p.$tone === 'live' ? st.bgAccentGreen
        : p.$tone === 'warn' ? st.bgAccentAmber
        : st.bg)};
    color: ${p => (p.$tone === 'live' ? '#047857' : p.$tone === 'warn' ? '#92400e' : st.textMuted)};

    svg { width: 11px; height: 11px; }
`;

const RotateBtn = styled.button`
    align-self: flex-start;
    padding: 6px 12px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: ${st.textSecondary};
    background: transparent;
    border: 1px solid ${st.border};
    border-radius: 999px;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover:not(:disabled) { background: ${st.bgCardAlt}; color: ${st.text}; }
    &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: 12px;
    color: ${st.accentRed};
`;

const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};

interface Props {
    visitId: string;
    /** Punkty z otwartego edytora — zasiewamy nimi sesję, żeby telefon nie startował z pustej mapy. */
    currentPoints: DamagePoint[];
    vehicleType: string;
    /**
     * Identyfikatory zdjęć, które JUŻ są zdjęciami wizyty. Telefon odsyła pełną mapę,
     * więc przy punktach zasianych z komputera wracają właśnie te identyfikatory —
     * bez tej listy podmiana niżej uznałaby je za nierozwiązane i zrzuciłaby zdjęcia
     * z punktów.
     */
    knownPhotoIds: string[];
    /**
     * Punkty przyszły z telefonu. Identyfikatory zdjęć są już podmienione na
     * identyfikatory zdjęć WIZYTY (patrz [claimAndRemap]).
     */
    onPointsFromPhone: (points: DamagePoint[], vehicleType: string | null) => void;
    /** Zdjęcia z telefonu weszły do galerii wizyty — odśwież listę „Istniejące". */
    onPhotosClaimed: (photos: ClaimedMobilePhoto[]) => void;
}

export const DamageMapQrPanel = ({
    visitId,
    currentPoints,
    vehicleType,
    knownPhotoIds,
    onPointsFromPhone,
    onPhotosClaimed,
}: Props) => {
    const [token, setToken] = useState<string | null>(null);
    const [checkinId, setCheckinId] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [phoneSeen, setPhoneSeen] = useState(false);

    /*
     * Tablica „identyfikator tymczasowy → zdjęcie wizyty", trzymana przez całe życie
     * panelu. Telefon ma własny stan i przy każdym zapisie przysyła SWOJE, tymczasowe
     * identyfikatory — także po tym, jak przenieśliśmy zdjęcie do galerii wizyty i
     * obiekt tymczasowy przestał istnieć. Bez tej tablicy drugi zapis z telefonu
     * wstawiałby wskaźniki, których nic już nie rozwiązuje, i zdjęcia znikałyby
     * z punktów.
     */
    const photoIdRemap = useRef<Map<string, string>>(new Map());

    // Zasiew sesji wymaga AKTUALNYCH punktów, ale nie chcemy przeładowywać tokena za
    // każdym postawionym punktem — ref trzyma najnowsze bez wchodzenia w zależności.
    const pointsRef = useRef(currentPoints);
    const vehicleTypeRef = useRef(vehicleType);
    const knownPhotoIdsRef = useRef(knownPhotoIds);
    useEffect(() => {
        pointsRef.current = currentPoints;
        vehicleTypeRef.current = vehicleType;
        knownPhotoIdsRef.current = knownPhotoIds;
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

    // Jedno wywołanie na otwarcie zakładki. `rotate = false`, więc telefon, który już
    // zeskanował kod, nie wypada z sesji przy ponownym wejściu w zakładkę.
    const startedRef = useRef(false);
    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        void start(false);
    }, [start]);

    useEffect(() => {
        if (secondsLeft <= 0) return;
        const id = setInterval(() => setSecondsLeft(prev => Math.max(0, prev - 1)), 1000);
        return () => clearInterval(id);
    }, [secondsLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Przenosi świeże zdjęcia z telefonu do galerii wizyty i zapisuje mapowanie
     * identyfikatorów. Wywoływane przy każdym zdarzeniu z telefonu, bo zdjęcie musi
     * stać się zdjęciem wizyty ZARAZ po zrobieniu — inaczej okno przez całą edycję
     * trzymałoby wskaźniki na pliki tymczasowe.
     */
    const claimAndRemap = useCallback(async () => {
        try {
            const { photos } = await visitApi.claimDamageMapQrPhotos(visitId);
            if (photos.length === 0) return;
            photos.forEach(p => photoIdRemap.current.set(p.temporaryPhotoId, p.photoId));
            onPhotosClaimed(photos);
        } catch {
            /*
             * Cicho: przeniesienie zdjęć jest krokiem pomocniczym, a nie tym, po co
             * operator tu jest. Punkty z telefonu i tak wejdą do edytora; zdjęcie bez
             * rozwiązanego identyfikatora zostanie pominięte niżej, a kolejne
             * zdarzenie spróbuje ponownie.
             */
        }
    }, [visitId, onPhotosClaimed]);

    /*
     * Treści zdarzenia nie czytamy: interesuje nas wyłącznie fakt, że telefon
     * właśnie coś wysłał. Co dokładnie doszło, mówi odpowiedź na `claim`, bo tylko
     * ona zna nowe identyfikatory zdjęć wizyty.
     */
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
                    if (resolved) return { ...photo, photoId: resolved, thumbnailUrl: undefined };
                    // 2. Zdjęcie, które było przypięte jeszcze przed sesją — telefon
                    //    oddaje je z tym samym identyfikatorem i tak ma zostać.
                    if (known.has(photo.photoId)) return { ...photo, thumbnailUrl: undefined };
                    /*
                     * 3. Nierozwiązane: świeże zdjęcie z telefonu, którego
                     *    przeniesienie jeszcze nie doszło. Pomijamy, zamiast wstawiać
                     *    martwy wskaźnik — punkt zostaje, a kolejne zdarzenie z
                     *    telefonu przyniesie je z rozwiązanym identyfikatorem.
                     */
                    return null;
                })
                .filter((p): p is NonNullable<typeof p> => p !== null),
        }));

        onPointsFromPhone(remapped, event.vehicleType ?? null);
    }, [claimAndRemap, onPointsFromPhone]);

    useCheckinSocket({
        checkinId,
        onPhotoUploaded: handlePhotoUploaded,
        onDamageUpdated: handleDamageUpdated,
        enabled: !!checkinId && secondsLeft > 0,
    });

    const qrUrl = token ? `${window.location.origin}/m/upload?t=${token}` : null;
    const isExpired = token !== null && secondsLeft === 0;

    return (
        <Wrap>
            <QrRow>
                <QrBox>
                    {isStarting && <QrPlaceholder>Generowanie kodu...</QrPlaceholder>}
                    {!isStarting && error && <QrPlaceholder>Błąd</QrPlaceholder>}
                    {!isStarting && !error && qrUrl && !isExpired && (
                        <QRCodeSVG value={qrUrl} size={130} level="M" />
                    )}
                    {!isStarting && !error && isExpired && <QrPlaceholder>Kod wygasł</QrPlaceholder>}
                </QrBox>

                <QrTexts>
                    <QrTitle>Zeskanuj telefonem i oznacz uszkodzenia na miejscu</QrTitle>
                    <QrSubtitle>
                        Telefon otwiera ten sam formularz co przy przyjęciu pojazdu:
                        schemat do zaznaczania punktów i aparat. Zdjęcia i oznaczenia
                        wchodzą do tego okna na bieżąco — zapisuje je dopiero
                        „Zapisz mapę uszkodzeń".
                    </QrSubtitle>

                    <StatusRow>
                        {phoneSeen ? (
                            <Pill $tone="live">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Telefon podłączony
                            </Pill>
                        ) : (
                            <Pill $tone="muted">Czekam na telefon</Pill>
                        )}
                        {!isExpired && secondsLeft > 0 && (
                            <Pill $tone={secondsLeft < 300 ? 'warn' : 'muted'}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                Ważny {formatCountdown(secondsLeft)}
                            </Pill>
                        )}
                    </StatusRow>
                </QrTexts>
            </QrRow>

            {error && <ErrorText>{error}</ErrorText>}

            <RotateBtn type="button" onClick={() => void start(true)} disabled={isStarting}>
                {isExpired ? 'Wygeneruj nowy kod' : 'Wygeneruj nowy kod (unieważnia poprzedni)'}
            </RotateBtn>
        </Wrap>
    );
};
