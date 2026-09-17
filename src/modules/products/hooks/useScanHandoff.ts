// src/modules/products/hooks/useScanHandoff.ts
//
// Sesja skanowania telefonem od strony KOMPUTERA — dokładnie model mapy uszkodzeń:
// otwieramy sesję (→ kod QR), a wykryte przez telefon kody wracają po WebSocketcie.
// Odpytywanie GET co 3 s jest zapasem na słaby WiFi w warsztacie (ta sama decyzja co
// przy handoffie mapy uszkodzeń i imporcie kontaktów).

import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeToTopic } from '@/core/socketClient';
import { useAuth } from '@/core/context/AuthContext';
import { productsApi } from '../api/productsApi';
import type { ScanSession } from '../types';

const POLL_MS = 3000;

/**
 * Kody z sesji jako ciągi — niezależnie od tego, czy ramka niesie `["590..."]`, czy
 * `[{code:"590...", scannedAt:"..."}]`.
 *
 * Serwer wysyłał po WebSocketcie surową sesję (obiekty), a REST-em już same ciągi.
 * `String(obiekt)` dawało `"[object Object]"`, które lądowało w polu kodu i odbijało
 * się od walidacji sumy kontrolnej. Serwer jest naprawiony, ale ta funkcja zostaje:
 * podczas wdrożenia stara i nowa wersja żyją przez chwilę obok siebie.
 */
function toCodeStrings(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map(entry => {
            if (typeof entry === 'string') return entry;
            if (entry && typeof entry === 'object' && 'code' in entry) {
                const code = (entry as { code: unknown }).code;
                return typeof code === 'string' ? code : '';
            }
            return '';
        })
        .filter(Boolean);
}

export function useScanHandoff() {
    const { user } = useAuth();
    const [session, setSession] = useState<ScanSession | null>(null);
    const [codes, setCodes] = useState<string[]>([]);
    const [starting, setStarting] = useState(false);
    const pollRef = useRef<number | null>(null);
    const unsubRef = useRef<(() => void) | null>(null);

    const mergeCodes = useCallback((incoming: string[]) => {
        setCodes(prev => {
            const seen = new Set(prev);
            const added = incoming.filter(c => !seen.has(c));
            return added.length ? [...prev, ...added] : prev;
        });
    }, []);

    const stop = useCallback(() => {
        if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
        if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    }, []);

    const start = useCallback(async () => {
        setStarting(true);
        try {
            const s = await productsApi.openScanSession();
            setSession(s);
            setCodes(toCodeStrings(s.scannedCodes));

            // WebSocket: /topic/studio.{studioId}.product-scan.{sessionId}
            if (user?.studioId) {
                stop();
                unsubRef.current = subscribeToTopic(
                    `/topic/studio.${user.studioId}.product-scan.${s.sessionId}`,
                    msg => {
                        try {
                            const payload = JSON.parse(msg.body) as ScanSession;
                            mergeCodes(toCodeStrings(payload.scannedCodes));
                        } catch { /* ignoruj złą ramkę */ }
                    },
                );
            }
            // Polling zapasowy.
            pollRef.current = window.setInterval(async () => {
                try {
                    const fresh = await productsApi.getScanSession(s.sessionId);
                    mergeCodes(toCodeStrings(fresh.scannedCodes));
                    if (fresh.status !== 'OPEN') stop();
                } catch { /* sesja mogła wygasnąć — poll zgaśnie z komponentem */ }
            }, POLL_MS);

            return s;
        } finally {
            setStarting(false);
        }
    }, [user?.studioId, mergeCodes, stop]);

    const reset = useCallback(() => {
        stop();
        if (session) productsApi.closeScanSession(session.sessionId).catch(() => {});
        setSession(null);
        setCodes([]);
    }, [session, stop]);

    useEffect(() => () => stop(), [stop]);

    return { session, codes, starting, start, reset };
}
