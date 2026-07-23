// src/modules/checkin/views/mobile/useMobileDamageLogic.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { checkinApi } from '../../api/checkinApi';
import type { AnnotationStroke, DamagePoint, DamagePointPhoto } from '../../types';
import type { SaveStatus } from './MobilePhotoUpload.styles';

const DEBOUNCE_MS = 1_800;
const LS_KEY = (token: string) => `mobile-damage-${token}`;

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface MobileDamageLogic {
    damagePoints: DamagePoint[];
    saveStatus: SaveStatus;
    updatePoints: (points: DamagePoint[]) => void;
    /** Returns the created placeholder photos (with stable localId) so the UI
     *  can immediately open the annotation editor for the captured photo. */
    attachPhotos: (pointId: number, files: File[]) => DamagePointPhoto[];
    removePhoto: (pointId: number, photoId: string) => void;
    setPhotoStrokes: (pointId: number, photoId: string, strokes: AnnotationStroke[]) => void;
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

    // Always-current points — photo upload callbacks resolve after state changes
    const pointsRef = useRef<DamagePoint[]>([]);
    pointsRef.current = damagePoints;

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

            // Offline fallback (drop dead blob: preview URLs and unfinished uploads)
            const stored = localStorage.getItem(LS_KEY(token));
            if (stored) {
                try {
                    const parsed: DamagePoint[] = JSON.parse(stored);
                    setDamagePoints(parsed.map(p => ({
                        ...p,
                        photos: (p.photos ?? [])
                            .filter(ph => ph.status !== 'uploading' && ph.status !== 'failed')
                            .map(ph => ({
                                ...ph,
                                thumbnailUrl: ph.thumbnailUrl?.startsWith('blob:') ? undefined : ph.thumbnailUrl,
                            })),
                    })));
                } catch { /* corrupt */ }
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

    // ─── Damage photos ────────────────────────────────────────────────────────

    /** Applies `mutate` to a single photo of a single point in the current list.
     *  Matches by photoId OR the stable localId, so callers can keep referencing
     *  a photo while its photoId transitions from placeholder to server id. */
    const mutatePhoto = useCallback((
        points: DamagePoint[],
        pointId: number,
        photoId: string,
        mutate: (photo: DamagePointPhoto) => DamagePointPhoto | null,
    ): DamagePoint[] =>
        points.map(p => {
            if (p.id !== pointId) return p;
            const photos = (p.photos ?? [])
                .map(ph => (ph.photoId === photoId || ph.localId === photoId) ? mutate(ph) : ph)
                .filter((ph): ph is DamagePointPhoto => ph !== null);
            return { ...p, photos };
        }),
    []);

    const attachPhotos = useCallback((pointId: number, files: File[]): DamagePointPhoto[] => {
        const created: DamagePointPhoto[] = [];

        for (const file of files) {
            if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
                alert(`Nieobsługiwany format: ${file.type}. Używaj JPEG, PNG lub WebP.`);
                continue;
            }
            if (file.size > MAX_PHOTO_SIZE_BYTES) {
                alert(`Plik "${file.name}" przekracza 10 MB.`);
                continue;
            }

            const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const previewUrl = URL.createObjectURL(file);
            const placeholder: DamagePointPhoto = {
                photoId: localId,
                localId,
                strokes: [],
                thumbnailUrl: previewUrl,
                status: 'uploading',
            };
            created.push(placeholder);

            updatePoints(pointsRef.current.map(p =>
                p.id === pointId ? { ...p, photos: [...(p.photos ?? []), placeholder] } : p
            ));

            checkinApi.uploadMobilePhoto(file, file.name, token)
                .then(res => {
                    updatePoints(mutatePhoto(pointsRef.current, pointId, localId, ph => ({
                        ...ph,
                        photoId: res.photoId,
                        status: 'done',
                    })));
                })
                .catch(() => {
                    updatePoints(mutatePhoto(pointsRef.current, pointId, localId, ph => ({
                        ...ph,
                        status: 'failed',
                    })));
                });
        }

        return created;
    }, [token, updatePoints, mutatePhoto]);

    const removePhoto = useCallback((pointId: number, photoId: string) => {
        updatePoints(mutatePhoto(pointsRef.current, pointId, photoId, ph => {
            if (ph.thumbnailUrl?.startsWith('blob:')) URL.revokeObjectURL(ph.thumbnailUrl);
            return null;
        }));
    }, [updatePoints, mutatePhoto]);

    const setPhotoStrokes = useCallback((pointId: number, photoId: string, strokes: AnnotationStroke[]) => {
        updatePoints(mutatePhoto(pointsRef.current, pointId, photoId, ph => ({ ...ph, strokes })));
    }, [updatePoints, mutatePhoto]);

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

    return { damagePoints, saveStatus, updatePoints, attachPhotos, removePhoto, setPhotoStrokes };
}
