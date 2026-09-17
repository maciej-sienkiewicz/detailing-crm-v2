// src/modules/products/hooks/useBarcodeScanner.ts
//
// Skaner kodu kreskowego z kamery telefonu. Preferujemy natywne BarcodeDetector — zero
// kilobajtów w bundlu. Gdzie go nie ma (starsze iOS Safari), oddajemy uczciwą informację
// zamiast martwego przycisku (wzorzec z MobileContactsImportView) i zostaje wpisanie
// ręczne kodu.

import { useCallback, useEffect, useRef, useState } from 'react';

// BarcodeDetector nie jest w standardowych typach DOM.
type DetectedBarcode = { rawValue: string };
interface BarcodeDetectorLike {
    detect: (source: CanvasImageSource | ImageBitmap | Blob) => Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

export function isBarcodeDetectorAvailable(): boolean {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export function useBarcodeScanner() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<BarcodeDetectorLike | null>(null);
    const loopRef = useRef<number | null>(null);
    const lastHit = useRef<{ code: string; at: number }>({ code: '', at: 0 });
    const [active, setActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supported = isBarcodeDetectorAvailable();

    const start = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            if (supported) {
                const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
                detectorRef.current = new Ctor({ formats: FORMATS });
            }
            setActive(true);
        } catch {
            setError('Nie udało się uruchomić aparatu. Sprawdź uprawnienia w przeglądarce.');
        }
    }, [supported]);

    const stop = useCallback(() => {
        if (loopRef.current !== null) {
            clearInterval(loopRef.current);
            loopRef.current = null;
        }
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setActive(false);
    }, []);

    /** Robi zdjęcie z bieżącej klatki i wykrywa kod. Zwraca surowy kod albo null. */
    const capture = useCallback(async (): Promise<string | null> => {
        const video = videoRef.current;
        const detector = detectorRef.current;
        if (!video || !detector) return null;
        try {
            const bitmap = await createImageBitmap(video);
            const found = await detector.detect(bitmap);
            bitmap.close?.();
            return found[0]?.rawValue ?? null;
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
        if (!supported) return;
        if (loopRef.current !== null) clearInterval(loopRef.current);
        loopRef.current = window.setInterval(async () => {
            const code = await capture();
            if (!code) return;
            const now = Date.now();
            if (code === lastHit.current.code && now - lastHit.current.at < 2500) return;
            lastHit.current = { code, at: now };
            onDetected(code);
        }, 400);
    }, [start, capture, supported]);

    useEffect(() => () => stop(), [stop]);

    return { videoRef, active, error, supported, start, stop, capture, startContinuous };
}
