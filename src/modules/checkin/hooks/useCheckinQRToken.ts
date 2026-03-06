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

export function useCheckinQRToken(appointmentId: string): UseCheckinQRTokenResult {
    const [tokenData, setTokenData] = useState<QRTokenResponse | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

        // Schedule auto-refresh 2 minutes before expiry
        const msLeft = new Date(expiresAt).getTime() - Date.now();
        const refreshIn = Math.max(0, msLeft - REFRESH_BEFORE_EXPIRY_MS);
        refreshTimerRef.current = setTimeout(() => {
            fetchToken();
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

    useEffect(() => {
        fetchToken();
        return () => clearTimers();
    }, [fetchToken]);

    const qrUrl = tokenData
        ? `${window.location.origin}/m/upload?t=${tokenData.token}`
        : null;

    const isExpired = secondsLeft === 0 && tokenData !== null;

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
