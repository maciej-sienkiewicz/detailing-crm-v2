// src/modules/checkin/views/mobile/useMobileDamageLogic.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { checkinApi } from '../../api/checkinApi';
import { prepareImageOrExplain } from '../../services/imageUploadPrep';
import { describeUploadError } from './uploadErrors';
import type { AnnotationStroke, DamagePoint, DamagePointPhoto } from '../../types';
import type { SaveStatus } from './MobilePhotoUpload.styles';

const DEBOUNCE_MS = 1_800;
const LS_KEY = (token: string) => `mobile-damage-${token}`;

/**
 * Zapisane na serwerze oznaczenia plus te dodane na telefonie, zanim odpowiedź doszła.
 * Oba zbiory liczyły od 1, więc lokalny punkt o zajętym id dostaje następny wolny.
 * Wolne id zostaje bez zmian: wysyłka zdjęcia do tego punktu szuka go po id.
 */
export function mergeLocalPoints(server: DamagePoint[], local: DamagePoint[]): DamagePoint[] {
    const taken = new Set(server.map(p => p.id));
    let nextId = Math.max(0, ...server.map(p => p.id), ...local.map(p => p.id));
    return [
        ...server,
        ...local.map(p => (taken.has(p.id) ? { ...p, id: ++nextId } : p)),
    ];
}

export interface MobileDamageLogic {
    damagePoints: DamagePoint[];
    vehicleType: string;
    setVehicleType: (type: string) => void;
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
    const [vehicleType, setVehicleTypeState] = useState<string>('sedan');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSavingRef = useRef(false);
    const pendingSaveRef = useRef<DamagePoint[] | null>(null);

    /*
     * Zawsze aktualna lista. Ustawiana SYNCHRONICZNIE w updatePoints, a nie przy
     * renderze: kilka zmian w jednym zdarzeniu (pętla po zdjęciach w attachPhotos)
     * czytało listę sprzed pierwszej zmiany i gubiło wszystkie oprócz ostatniej.
     */
    const pointsRef = useRef<DamagePoint[]>([]);
    const vehicleTypeRef = useRef(vehicleType);
    vehicleTypeRef.current = vehicleType;

    /*
     * Mapa jest dotykalna od razu, a zapisane oznaczenia przychodzą z serwera chwilę
     * później. Dotknięcie w tej chwili dawniej znikało: odpowiedź nadpisywała listę,
     * a odroczony zapis wysyłał punkt z chwili dotknięcia - „Zapisano" bez znacznika,
     * a przy sesji z zapisanymi już oznaczeniami zapis kasował je na serwerze.
     * Dlatego do czasu odpowiedzi pamiętamy, że użytkownik coś zmienił, i łączymy.
     */
    const loadedRef = useRef(false);
    const editedBeforeLoadRef = useRef(false);
    const typeChosenBeforeLoadRef = useRef(false);
    // Wczytanie (efekt niżej) zapisuje połączoną listę tą samą drogą co dotknięcie.
    const updatePointsRef = useRef<(points: DamagePoint[]) => void>(() => {});

    // ─── Load from backend (fallback: localStorage) on session start ──────────

    useEffect(() => {
        if (!sessionReady || !token) return;

        const load = async () => {
            // Try backend first
            try {
                const res = await checkinApi.getMobileDamagePoints(token);
                loadedRef.current = true;
                if (res.vehicleType && !typeChosenBeforeLoadRef.current) {
                    setVehicleTypeState(res.vehicleType);
                    vehicleTypeRef.current = res.vehicleType;
                }
                if (editedBeforeLoadRef.current) {
                    // Zapis listy połączonej - inaczej serwer zostałby z tym, co wysłał
                    // odroczony zapis sprzed odpowiedzi.
                    updatePointsRef.current(mergeLocalPoints(res.damagePoints, pointsRef.current));
                    return;
                }
                pointsRef.current = res.damagePoints;
                setDamagePoints(res.damagePoints);
                // Persist locally as backup
                localStorage.setItem(LS_KEY(token), JSON.stringify({
                    damagePoints: res.damagePoints,
                    vehicleType: res.vehicleType ?? undefined,
                }));
                return;
            } catch {
                // Fall through to localStorage
            }
            loadedRef.current = true;
            // Zmiany sprzed odpowiedzi są już w localStorage (updatePoints zapisuje tam od
            // razu) i na ekranie - kopia lokalna nie ma czego do nich dołożyć.
            if (editedBeforeLoadRef.current) return;

            // Offline fallback (drop dead blob: preview URLs and unfinished uploads)
            const stored = localStorage.getItem(LS_KEY(token));
            if (stored) {
                try {
                    const raw = JSON.parse(stored);
                    // Backward compat: older versions stored a bare points array
                    const parsed: DamagePoint[] = Array.isArray(raw) ? raw : (raw.damagePoints ?? []);
                    if (!Array.isArray(raw) && raw.vehicleType) setVehicleTypeState(raw.vehicleType);
                    const restored = parsed.map(p => ({
                        ...p,
                        photos: (p.photos ?? [])
                            .filter(ph => ph.status !== 'uploading' && ph.status !== 'failed')
                            .map(ph => ({
                                ...ph,
                                thumbnailUrl: ph.thumbnailUrl?.startsWith('blob:') ? undefined : ph.thumbnailUrl,
                            })),
                    }));
                    pointsRef.current = restored;
                    setDamagePoints(restored);
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
            await checkinApi.saveMobileDamagePoints(token, points, vehicleTypeRef.current);
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
        if (!loadedRef.current) editedBeforeLoadRef.current = true;
        pointsRef.current = points;
        setDamagePoints(points);
        // Always persist locally immediately
        localStorage.setItem(LS_KEY(token), JSON.stringify({
            damagePoints: points,
            vehicleType: vehicleTypeRef.current,
        }));

        if (!isOnline) {
            setSaveStatus('offline');
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        // Zapis tego, co jest na ekranie w chwili zapisu, a nie listy z chwili zmiany.
        debounceRef.current = setTimeout(() => {
            saveToBackend(pointsRef.current);
        }, DEBOUNCE_MS);
    }, [token, isOnline, saveToBackend]);
    updatePointsRef.current = updatePoints;

    // ─── Vehicle type ─────────────────────────────────────────────────────────

    /** Changing the body type re-persists the whole damage state, so the backend
     *  always knows which schematic the coordinates refer to. */
    const setVehicleType = useCallback((type: string) => {
        if (!loadedRef.current) typeChosenBeforeLoadRef.current = true;
        setVehicleTypeState(type);
        vehicleTypeRef.current = type;
        updatePoints(pointsRef.current);
    }, [updatePoints]);

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

            const markFailed = () => updatePoints(
                mutatePhoto(pointsRef.current, pointId, localId, ph => ({ ...ph, status: 'failed' }))
            );

            // Gallery picks are raw originals (HEIC, >10 MB) - normalise before uploading
            prepareImageOrExplain(file)
                .then(prepared => {
                    if (!prepared.file) {
                        markFailed();
                        alert(prepared.error);
                        return;
                    }
                    return checkinApi.uploadMobilePhoto(prepared.file, prepared.file.name, token)
                        .then(res => {
                            updatePoints(mutatePhoto(pointsRef.current, pointId, localId, ph => ({
                                ...ph,
                                photoId: res.photoId,
                                status: 'done',
                            })));
                        })
                        .catch(err => {
                            markFailed();
                            console.warn('[mobile-damage] photo upload failed:', describeUploadError(err));
                        });
                })
                .catch(markFailed);
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

    return {
        damagePoints,
        vehicleType,
        setVehicleType,
        saveStatus,
        updatePoints,
        attachPhotos,
        removePhoto,
        setPhotoStrokes,
    };
}
