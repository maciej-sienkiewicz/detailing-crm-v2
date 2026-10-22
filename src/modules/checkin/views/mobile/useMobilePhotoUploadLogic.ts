// src/modules/checkin/views/mobile/useMobilePhotoUploadLogic.ts

import { useState, useRef, useEffect, useCallback } from 'react';
import { checkinApi } from '../../api/checkinApi';
import { offlinePhotoDb } from '../../services/offlinePhotoDb';
import { prepareImageOrExplain } from '../../services/imageUploadPrep';
import { describeUploadError, isSessionGoneError } from './uploadErrors';
import type { MobileCheckinContext, MobileSessionEndReason, MobileSessionStatus, PendingPhoto } from '../../types';

const RETRY_INTERVAL_MS = 30_000;
/**
 * Co ile telefon pyta o stan sesji. Krótko, bo od tego zależy, jak szybko człowiek
 * z telefonem zobaczy, że komputer skończył - a zapytanie to jeden klucz w Redisie.
 */
export const STATUS_POLL_INTERVAL_MS = 5_000;

export interface LocalPhoto {
    id: string;
    previewUrl: string;
    fileName: string;
    status: 'pending' | 'uploading' | 'done' | 'failed';
    error?: string;
}

/**
 * - `ended` - komputer zakończył sesję (powód w `endReason`): „Gotowe", zamknięte okno,
 *   przerwane przyjęcie albo nowy kod. Strona nic już nie wysyła.
 * - `visit_created` - wizyta z przyjęcia zapisana; strona dalej słucha, bo przyjęcie
 *   można jeszcze przerwać w oknie dokumentów.
 */
export type SessionState = 'loading' | 'expired' | 'active' | 'done' | 'visit_created' | 'ended';

/** Powody, po których komputer zamknął sesję - bez zapisania wizyty. */
export type DesktopEndReason = Exclude<MobileSessionEndReason, 'VISIT_CREATED'>;

export interface MobilePhotoUploadLogic {
    context: MobileCheckinContext | null;
    sessionState: SessionState;
    /** Ustawione w stanie `ended`. */
    endReason: DesktopEndReason | null;
    /** Sesja żyje, ale okno na komputerze jest zamknięte (VIN). */
    paused: boolean;
    isOnline: boolean;
    photos: LocalPhoto[];
    doneCount: number;
    totalCount: number;
    progressPct: number;
    hasPending: boolean;
    /** Photos being decoded/re-encoded before they enter the upload queue. */
    preparingCount: number;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRetry: (photoId: string) => void;
    handleRemove: (photoId: string, previewUrl: string) => void;
    handleMarkDone: () => Promise<void>;
    handleUndoDone: () => void;
}

export function useMobilePhotoUploadLogic(token: string): MobilePhotoUploadLogic {
    const [context, setContext] = useState<MobileCheckinContext | null>(null);
    const [sessionState, setSessionState] = useState<SessionState>('loading');
    const [endReason, setEndReason] = useState<DesktopEndReason | null>(null);
    const [paused, setPaused] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [photos, setPhotos] = useState<LocalPhoto[]>([]);
    const [preparingCount, setPreparingCount] = useState(0);

    const isSyncingRef = useRef(false);
    // Zdjęcie zajęte do wysyłki PRZED otwarciem tej strony nie jest w drodze - jego strona
    // zginęła (offlinePhotoDb.claim).
    const pageOpenedAtRef = useRef(Date.now());
    // Mirrors `photos` so previews can be revoked without reading state inside updaters
    const photosRef = useRef<LocalPhoto[]>([]);
    photosRef.current = photos;

    // ─── Network status ───────────────────────────────────────────────────────

    useEffect(() => {
        const setOnline = () => setIsOnline(true);
        const setOffline = () => setIsOnline(false);
        window.addEventListener('online', setOnline);
        window.addEventListener('offline', setOffline);
        return () => {
            window.removeEventListener('online', setOnline);
            window.removeEventListener('offline', setOffline);
        };
    }, []);

    // ─── Session status ───────────────────────────────────────────────────────

    /**
     * Przekłada stan z serwera na ekran. Zwraca true, gdy sesja jest skończona albo
     * nieważna - wtedy nie ma po co dalej wysyłać zdjęć.
     */
    const applyStatus = useCallback((status: MobileSessionStatus): boolean => {
        const reason = status.endReason ?? (status.visitCreated ? 'VISIT_CREATED' : null);
        if (reason === 'VISIT_CREATED') { setSessionState('visit_created'); return true; }
        if (reason) { setEndReason(reason); setSessionState('ended'); return true; }
        if (!status.sessionActive) { setSessionState('expired'); return true; }
        setPaused(status.paused === true);
        return false;
    }, []);

    /** Sprawdza stan po nieudanej operacji: „wygasł" czy „zakończono na komputerze". */
    const explainSessionGone = useCallback(async () => {
        try {
            if (!applyStatus(await checkinApi.getMobileStatus(token))) setSessionState('expired');
        } catch {
            setSessionState('expired');
        }
    }, [token, applyStatus]);

    // ─── Init: verify token & restore pending photos ──────────────────────────

    /** Verifies the token and rebuilds the photo list from the offline queue. */
    const initSession = useCallback(async () => {
        if (!token) { setSessionState('expired'); return; }
        try {
            const ctx = await checkinApi.getMobileCheckinContext(token);
            setContext(ctx);
            setSessionState('active');

            const pending = await offlinePhotoDb.getByToken(token);
            const restored: LocalPhoto[] = pending.map(p => ({
                id: p.id,
                previewUrl: URL.createObjectURL(new Blob([p.fileData], { type: p.mimeType })),
                fileName: p.fileName,
                status: p.status === 'uploading' ? 'pending' : p.status,
                error: p.error,
            }));
            // Re-running init (session recovery) replaces the list - free the old previews
            photosRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl));
            setPhotos(restored);
        } catch {
            // Ponowne otwarcie linku po zakończeniu na komputerze ma powiedzieć, że
            // zakończono, a nie że link wygasł.
            await explainSessionGone();
        }
    }, [token, explainSessionGone]);

    useEffect(() => {
        initSession();
    }, [initSession]);

    // ─── Upload one photo ─────────────────────────────────────────────────────

    /**
     * Jedyna droga zdjęcia na serwer. Wołają ją wybór pliku, „Ponów" i kolejka - każde
     * najpierw zajmuje zdjęcie (offlinePhotoDb.claim), więc to samo zdjęcie nigdy nie
     * idzie dwa razy naraz, a już wysłane nie idzie wcale.
     */
    const uploadOne = useCallback(async (photoId: string): Promise<void> => {
        const pending = await offlinePhotoDb.claim(photoId, pageOpenedAtRef.current);
        if (!pending) return;
        setPhotos(prev => prev.map(p =>
            p.id === pending.id ? { ...p, status: 'uploading' as const, error: undefined } : p
        ));

        try {
            const blob = new Blob([pending.fileData], { type: pending.mimeType });
            await checkinApi.uploadMobilePhoto(blob, pending.fileName, token, pending.id);
            await offlinePhotoDb.updateStatus(pending.id, 'done');
            setPhotos(prev => prev.map(p =>
                p.id === pending.id ? { ...p, status: 'done' as const, error: undefined } : p
            ));
        } catch (err) {
            const msg = describeUploadError(err);
            if (isSessionGoneError(err)) {
                void explainSessionGone();
            }
            await offlinePhotoDb.updateStatus(pending.id, 'failed', { error: msg });
            setPhotos(prev => prev.map(p =>
                p.id === pending.id ? { ...p, status: 'failed' as const, error: msg } : p
            ));
            throw err;
        }
    }, [token, explainSessionGone]);

    // ─── Sync all pending ─────────────────────────────────────────────────────

    const syncPending = useCallback(async () => {
        if (isSyncingRef.current || !isOnline) return;
        isSyncingRef.current = true;
        try {
            const pending = await offlinePhotoDb.getPendingByToken(token);
            for (const photo of pending) {
                try { await uploadOne(photo.id); } catch { /* continue */ }
            }
        } finally {
            isSyncingRef.current = false;
        }
    }, [token, isOnline, uploadOne]);

    useEffect(() => {
        if (sessionState !== 'active') return;
        const timer = setInterval(syncPending, RETRY_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [sessionState, syncPending]);

    // Także zaraz po otwarciu strony: zdjęcia z kolejki poprzedniej (przeładowanej) strony
    // mają ruszyć od razu, a nie po 30 s.
    useEffect(() => {
        if (isOnline && sessionState === 'active') syncPending();
    }, [isOnline, sessionState]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Status polling: detect when the desktop ends the session ────────────
    //
    // Wizyta zapisana, „Gotowe" albo zamknięte okno na komputerze, przerwane przyjęcie,
    // nowy kod - telefon ma to zobaczyć w kilka sekund, a nie dalej przyjmować zdjęcia
    // do okna, którego już nie ma. Po zapisaniu wizyty słuchamy dalej: przyjęcie można
    // jeszcze przerwać w oknie dokumentów.

    useEffect(() => {
        if (sessionState !== 'active' && sessionState !== 'done' && sessionState !== 'visit_created') return;

        const poll = async () => {
            try {
                const status = await checkinApi.getMobileStatus(token);
                if (sessionState === 'visit_created') {
                    if (status.endReason === 'CANCELLED') applyStatus(status);
                    return;
                }
                applyStatus(status);
            } catch (error) {
                // Token wygasł albo sesja zniknęła - stan „wygasło" kończy też odpytywanie.
                // Błąd sieci: próbujemy w następnym cyklu.
                if (isSessionGoneError(error)) setSessionState('expired');
            }
        };

        const timer = setInterval(poll, STATUS_POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [sessionState, token, applyStatus]);

    // ─── Re-check the session when the page comes back to the foreground ──────
    //
    // Opening the camera, switching apps or locking the phone suspends this page; on
    // return the token may already be gone (visit saved on desktop, QR replaced). Verify
    // once instead of letting the next upload fail with an opaque error, and resume the
    // queue when the session is still alive.

    useEffect(() => {
        if (sessionState === 'loading' || sessionState === 'visit_created' || sessionState === 'ended') return;

        const revalidate = async () => {
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
            try {
                const status = await checkinApi.getMobileStatus(token);
                if (applyStatus(status)) return;
                if (sessionState === 'expired') {
                    // Session is alive again (the earlier failure was a network blip) -
                    // rebuild context and queue before letting the user upload again
                    await initSession();
                    return;
                }
                syncPending();
            } catch {
                // Offline or unreachable - leave the current state, the poll will retry
            }
        };

        document.addEventListener('visibilitychange', revalidate);
        window.addEventListener('pageshow', revalidate);
        return () => {
            document.removeEventListener('visibilitychange', revalidate);
            window.removeEventListener('pageshow', revalidate);
        };
    }, [token, sessionState, syncPending, initSession, applyStatus]);

    // ─── Gotowe / Cofnij ──────────────────────────────────────────────────────

    const handleMarkDone = useCallback(async () => {
        try {
            await checkinApi.markMobileDone(token);
        } catch {
            // non-fatal: session may have just expired; still transition UI
        }
        setSessionState('done');
    }, [token]);

    const handleUndoDone = useCallback(() => {
        setSessionState('active');
        checkinApi.undoMobileDone(token).catch(() => {
            // sesja mogła się właśnie skończyć - pokaże to najbliższe sprawdzenie stanu
        });
    }, [token]);

    // ─── File selection ───────────────────────────────────────────────────────

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        // Reset the input straight away so picking the same file twice fires onChange again
        e.target.value = '';
        if (files.length === 0) return;

        setPreparingCount(count => count + files.length);
        const rejected: string[] = [];
        let unprocessed = files.length;

        try {
            for (const picked of files) {
                // Gallery picks arrive as untouched originals - HEIC from an iPhone, or a
                // 12 Mpx photo well over the 10 MB limit. Re-encode them instead of refusing.
                const prepared = await prepareImageOrExplain(picked);
                unprocessed -= 1;
                setPreparingCount(count => Math.max(0, count - 1));

                if (!prepared.file) {
                    rejected.push(prepared.error);
                    continue;
                }
                const file = prepared.file;

                const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const previewUrl = URL.createObjectURL(file);

                setPhotos(prev => [
                    { id, previewUrl, fileName: file.name, status: 'pending' as const },
                    ...prev,
                ]);

                const fileData = await file.arrayBuffer();
                const record: PendingPhoto = {
                    id, token,
                    fileName: file.name,
                    mimeType: file.type,
                    fileData,
                    queuedAt: Date.now(),
                    status: 'pending',
                };
                await offlinePhotoDb.add(record);

                if (isOnline) uploadOne(id).catch(() => {});
            }
        } finally {
            if (unprocessed > 0) setPreparingCount(count => Math.max(0, count - unprocessed));
        }

        if (rejected.length > 0) alert(rejected.join('\n\n'));
    }, [token, isOnline, uploadOne]);

    // Bez przepisywania statusu na „pending": kolejka mogła właśnie zająć to zdjęcie, a zdjęte
    // zajęcie pozwoliłoby wysłać je drugi raz obok niej. Nieudane zajmuje się wprost.
    const handleRetry = useCallback((photoId: string) => {
        if (isOnline) uploadOne(photoId).catch(() => {});
    }, [isOnline, uploadOne]);

    const handleRemove = useCallback(async (photoId: string, previewUrl: string) => {
        URL.revokeObjectURL(previewUrl);
        await offlinePhotoDb.remove(photoId);
        setPhotos(prev => prev.filter(p => p.id !== photoId));
    }, []);

    // ─── Derived ──────────────────────────────────────────────────────────────

    const doneCount = photos.filter(p => p.status === 'done').length;
    const totalCount = photos.length;
    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    // Tylko zdjęcia w drodze blokują „Gotowe". Nieudane nie: można je ponowić albo
    // usunąć, ale nie mogą zamknąć drogi do zakończenia.
    const hasPending = photos.some(p => p.status === 'pending' || p.status === 'uploading');

    return {
        context,
        sessionState,
        endReason,
        paused,
        isOnline,
        photos,
        doneCount,
        totalCount,
        progressPct,
        hasPending,
        preparingCount,
        handleFileChange,
        handleRetry,
        handleRemove,
        handleMarkDone,
        handleUndoDone,
    };
}
