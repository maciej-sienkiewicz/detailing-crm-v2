// src/modules/checkin/hooks/useCheckinQRToken.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkinApi } from '../api/checkinApi';
import { checkinErrorMessage, type CheckinErrorTexts } from '../utils/checkinErrorMessage';
import type { QRTokenResponse } from '../types';

// Karta kodu QR pokazuje ten tekst obok „Odśwież kod QR"; zdjęcia z dysku działają dalej.
const QR_ERROR_TEXTS: CheckinErrorTexts = {
    offline: 'Brak połączenia z serwerem. Kod QR nie powstał, odśwież go za chwilę.',
    server: 'Serwer nie utworzył kodu QR. Odśwież kod za chwilę.',
    fallback: 'Nie udało się utworzyć kodu QR. Odśwież kod za chwilę.',
};

const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000; // Refresh 2 minutes before expiry

export interface UseCheckinQRTokenResult {
    tokenData: QRTokenResponse | null;
    qrUrl: string | null;
    secondsLeft: number;
    isExpired: boolean;
    isLoading: boolean;
    error: string | null;
    /** Extends the current session - keeps a QR code that a phone already scanned alive. */
    refresh: () => Promise<void>;
    /** Issues a brand-new code and invalidates the previous one on purpose. */
    rotate: () => Promise<void>;
}

/**
 * Supplies the QR upload token for a check-in.
 *
 * The backend deliberately returns the SAME token on every call (refreshing its TTL):
 * this hook runs on every mount of the photo step, and issuing a new token there used to
 * revoke the code a phone had already scanned - so after leaving and re-entering the step
 * the phone could no longer upload ("Błąd podczas przesyłania zdjęcia"). Only [rotate]
 * replaces the code.
 */
export function useCheckinQRToken(appointmentId: string | undefined): UseCheckinQRTokenResult {
    const [tokenData, setTokenData] = useState<QRTokenResponse | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(Number.MAX_SAFE_INTEGER);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Always holds the latest fetchToken without creating a circular dep with startCountdown
    const fetchTokenRef = useRef<(rotate?: boolean) => Promise<void>>(async () => {});

    const clearTimers = () => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    };

    const startCountdown = useCallback((expiresAt: string) => {
        clearTimers();

        const tick = () => {
            const msLeft = new Date(expiresAt).getTime() - Date.now();
            setSecondsLeft(Math.max(0, Math.floor(msLeft / 1000)));
        };

        tick();
        countdownIntervalRef.current = setInterval(tick, 1000);

        // Schedule auto-refresh 2 minutes before expiry; use ref to avoid stale closure
        const msLeft = new Date(expiresAt).getTime() - Date.now();
        const refreshIn = Math.max(0, msLeft - REFRESH_BEFORE_EXPIRY_MS);
        refreshTimerRef.current = setTimeout(() => {
            fetchTokenRef.current();
        }, refreshIn);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchToken = useCallback(async (rotateToken = false) => {
        if (!appointmentId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await checkinApi.generateQRToken(appointmentId, { rotate: rotateToken });
            setTokenData(data);
            startCountdown(data.expiresAt);
        } catch (err) {
            // Dawniej `err.message`, czyli angielski tekst axiosa na karcie kodu QR.
            setError(checkinErrorMessage(err, QR_ERROR_TEXTS));
        } finally {
            setIsLoading(false);
        }
    }, [appointmentId, startCountdown]);

    const refresh = useCallback(() => fetchToken(false), [fetchToken]);
    const rotate = useCallback(() => fetchToken(true), [fetchToken]);

    // Keep ref in sync so startCountdown's setTimeout always calls the current fetchToken
    useEffect(() => {
        fetchTokenRef.current = fetchToken;
    }, [fetchToken]);

    useEffect(() => {
        fetchToken();
        return () => clearTimers();
    }, [fetchToken]);

    const qrUrl = tokenData
        ? `${window.location.origin}/m/upload?t=${tokenData.token}`
        : null;

    // Guard isLoading to avoid a flash of "Kod wygasł" between setTokenData and
    // setSecondsLeft (initial value of secondsLeft is MAX_SAFE_INTEGER, not 0, so the
    // race only happens when secondsLeft somehow reaches 0 before the tick fires)
    const isExpired = secondsLeft === 0 && !isLoading && tokenData !== null;

    return {
        tokenData,
        qrUrl,
        secondsLeft,
        isExpired,
        isLoading,
        error,
        refresh,
        rotate,
    };
}
