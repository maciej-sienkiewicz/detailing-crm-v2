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
            setCodes(s.scannedCodes);

            // WebSocket: /topic/studio.{studioId}.product-scan.{sessionId}
            if (user?.studioId) {
                stop();
                unsubRef.current = subscribeToTopic(
                    `/topic/studio.${user.studioId}.product-scan.${s.sessionId}`,
                    msg => {
                        try {
                            const payload = JSON.parse(msg.body) as ScanSession;
                            mergeCodes(payload.scannedCodes.map(String));
                        } catch { /* ignoruj złą ramkę */ }
                    },
                );
            }
            // Polling zapasowy.
            pollRef.current = window.setInterval(async () => {
                try {
                    const fresh = await productsApi.getScanSession(s.sessionId);
                    mergeCodes(fresh.scannedCodes);
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
