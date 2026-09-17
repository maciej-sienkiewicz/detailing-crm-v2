// src/modules/products/hooks/useBarcodeScanner.ts
//
// Skaner kodu kreskowego z kamery telefonu. Silnik dekodowania wybiera
// `barcodeDecoder.ts` (natywny BarcodeDetector albo ZXing w czystym JS), więc tu nie ma
// już stanu „nieobsługiwane" — jest tylko „aparat się nie uruchomił" (brak zgody, brak
// kamery, http zamiast https). Na ten przypadek widoki mają zapas: zdjęcie z pliku, które
// najpierw próbujemy odczytać TUTAJ (za darmo), a dopiero potem wysyłamy do modelu
// wizyjnego (jak przy VIN).

import { useCallback, useEffect, useRef, useState } from 'react';
import { createBarcodeDecoder, type BarcodeDecoder } from '../utils/barcodeDecoder';
import { fileToCanvas } from '../utils/imageTools';

// Klatka do pętli ciągłej: 960 px wystarcza EAN-13 z 20–30 cm, a ZXing w JS mieli ją na
// telefonie w kilkadziesiąt ms — powyżej tego rośnie tylko czas, nie skuteczność.
const LIVE_FRAME_MAX_SIDE = 960;

export function useBarcodeScanner() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const decoderRef = useRef<BarcodeDecoder | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const loopRef = useRef<number | null>(null);
    const lastHit = useRef<{ code: string; at: number }>({ code: '', at: 0 });
    const [active, setActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ensureDecoder = useCallback(async () => {
        if (!decoderRef.current) decoderRef.current = await createBarcodeDecoder();
        return decoderRef.current;
    }, []);

    const start = useCallback(async () => {
        setError(null);
        try {
            await ensureDecoder();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setActive(true);
        } catch {
            setError('Nie udało się uruchomić aparatu. Sprawdź uprawnienia w przeglądarce albo zrób zdjęcie kodu.');
        }
    }, [ensureDecoder]);

    const stop = useCallback(() => {
        if (loopRef.current !== null) {
            clearInterval(loopRef.current);
            loopRef.current = null;
        }
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setActive(false);
    }, []);

    /** Bieżąca klatka → canvas → dekoder. Zwraca surowy kod albo null. */
    const capture = useCallback(async (): Promise<string | null> => {
        const video = videoRef.current;
        const decoder = decoderRef.current;
        if (!video || !decoder || video.readyState < 2) return null;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return null;
        const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'));
        const scale = Math.min(1, LIVE_FRAME_MAX_SIDE / Math.max(w, h));
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
            return await decoder.detect(canvas);
        } catch {
            return null;
        }
    }, []);

    /**
     * Skan ciągły „jak MyFitnessPal": włącza aparat i sam wykrywa kody w pętli, bez
     * przycisku migawki. Ten sam kod nie leci dwa razy w ciągu 2,5 s (dedup), żeby
     * pojedyncze opakowanie w kadrze nie zgłaszało się kilkanaście razy na sekundę.
     */
    const startContinuous = useCallback(async (onDetected: (code: string) => void) => {
        await start();
        if (!streamRef.current) return; // aparat się nie uruchomił — error już ustawiony
        if (loopRef.current !== null) clearInterval(loopRef.current);
        let busy = false;
        loopRef.current = window.setInterval(async () => {
            if (busy) return; // ZXing w JS potrafi trwać dłużej niż interwał — nie nakładamy ticków
            busy = true;
            try {
                const code = await capture();
                if (!code) return;
                const now = Date.now();
                if (code === lastHit.current.code && now - lastHit.current.at < 2500) return;
                lastHit.current = { code, at: now };
                onDetected(code);
            } finally {
                busy = false;
            }
        }, 400);
    }, [start, capture]);

    /**
     * Zdjęcie z pliku (input capture=environment) → dekoder w przeglądarce. Zwraca kod
     * albo null; null znaczy „spróbuj modelem wizyjnym", nie „błąd".
     */
    const decodeImageFile = useCallback(async (file: Blob): Promise<string | null> => {
        try {
            const decoder = await ensureDecoder();
            const canvas = await fileToCanvas(file, 1600);
            return await decoder.detect(canvas);
        } catch {
            return null;
        }
    }, [ensureDecoder]);

    useEffect(() => () => stop(), [stop]);

    return { videoRef, active, error, start, stop, capture, startContinuous, decodeImageFile };
}
