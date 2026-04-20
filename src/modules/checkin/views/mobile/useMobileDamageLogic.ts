// src/modules/checkin/views/mobile/useMobileDamageLogic.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { checkinApi } from '../../api/checkinApi';
import type { DamagePoint } from '../../types';
import type { SaveStatus } from './MobilePhotoUpload.styles';

const DEBOUNCE_MS = 1_800;
const LS_KEY = (token: string) => `mobile-damage-${token}`;

export interface MobileDamageLogic {
    damagePoints: DamagePoint[];
    saveStatus: SaveStatus;
    updatePoints: (points: DamagePoint[]) => void;
}

export function useMobileDamageLogic(
    token: string,
    isOnline: boolean,
    sessionReady: boolean,
): MobileDamageLogic {
    const [damagePoints, setDamagePoints] = useState<DamagePoint[]>([]);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSavingRef = useRef(false);
    const pendingSaveRef = useRef<DamagePoint[] | null>(null);

    // ─── Load from backend (fallback: localStorage) on session start ──────────

    useEffect(() => {
        if (!sessionReady || !token) return;

        const load = async () => {
            // Try backend first
            try {
                const res = await checkinApi.getMobileDamagePoints(token);
                setDamagePoints(res.damagePoints);
                // Persist locally as backup
                localStorage.setItem(LS_KEY(token), JSON.stringify(res.damagePoints));
                return;
            } catch {
                // Fall through to localStorage
            }

            // Offline fallback
            const stored = localStorage.getItem(LS_KEY(token));
            if (stored) {
                try { setDamagePoints(JSON.parse(stored)); } catch { /* corrupt */ }
            }
        };

        load();
    }, [sessionReady, token]);

    // ─── Persist to backend ───────────────────────────────────────────────────

    const saveToBackend = useCallback(async (points: DamagePoint[]) => {
        if (isSavingRef.current) {
            pendingSaveRef.current = points;
            return;
        }

        isSavingRef.current = true;
        setSaveStatus('saving');

        try {
            await checkinApi.saveMobileDamagePoints(token, points);
            setSaveStatus('saved');
            // After 3s, reset to idle
            setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000);
        } catch {
            setSaveStatus('error');
        } finally {
            isSavingRef.current = false;
            if (pendingSaveRef.current !== null) {
                const next = pendingSaveRef.current;
                pendingSaveRef.current = null;
                saveToBackend(next);
            }
        }
    }, [token]);

    // ─── Debounced update ─────────────────────────────────────────────────────

    const updatePoints = useCallback((points: DamagePoint[]) => {
        setDamagePoints(points);
        // Always persist locally immediately
        localStorage.setItem(LS_KEY(token), JSON.stringify(points));

        if (!isOnline) {
            setSaveStatus('offline');
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            saveToBackend(points);
        }, DEBOUNCE_MS);
    }, [token, isOnline, saveToBackend]);

    // ─── Sync when coming back online ─────────────────────────────────────────

    useEffect(() => {
        if (!isOnline || saveStatus !== 'offline') return;
        saveToBackend(damagePoints);
    }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Cleanup ──────────────────────────────────────────────────────────────

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return { damagePoints, saveStatus, updatePoints };
}
