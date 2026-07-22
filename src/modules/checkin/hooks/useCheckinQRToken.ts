// src/modules/checkin/hooks/useCheckinQRToken.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkinApi } from '../api/checkinApi';
import type { QRTokenResponse } from '../types';

const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000; // Refresh 2 minutes before expiry

export interface UseCheckinQRTokenResult {
    tokenData: QRTokenResponse | null;
    qrUrl: string | null;
    secondsLeft: number;
    isExpired: boolean;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useCheckinQRToken(appointmentId: string | undefined): UseCheckinQRTokenResult {
    const [tokenData, setTokenData] = useState<QRTokenResponse | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(Number.MAX_SAFE_INTEGER);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Always holds the latest fetchToken without creating a circular dep with startCountdown
    const fetchTokenRef = useRef<() => Promise<void>>(async () => {});

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

        // Schedule auto-refresh 2 minutes before expiry — use ref to avoid stale closure
        const msLeft = new Date(expiresAt).getTime() - Date.now();
        const refreshIn = Math.max(0, msLeft - REFRESH_BEFORE_EXPIRY_MS);
        refreshTimerRef.current = setTimeout(() => {
            fetchTokenRef.current();
        }, refreshIn);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchToken = useCallback(async () => {
        if (!appointmentId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await checkinApi.generateQRToken(appointmentId);
            setTokenData(data);
            startCountdown(data.expiresAt);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Błąd generowania tokena QR';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [appointmentId, startCountdown]);

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
        refresh: fetchToken,
    };
}
