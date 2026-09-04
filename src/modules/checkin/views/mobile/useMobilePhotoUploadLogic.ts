// src/modules/checkin/views/mobile/useMobilePhotoUploadLogic.ts

import { useState, useRef, useEffect, useCallback } from 'react';
import { checkinApi } from '../../api/checkinApi';
import { offlinePhotoDb } from '../../services/offlinePhotoDb';
import { prepareImageOrExplain } from '../../services/imageUploadPrep';
import { describeUploadError, isSessionGoneError } from './uploadErrors';
import type { MobileCheckinContext, PendingPhoto } from '../../types';

const RETRY_INTERVAL_MS = 30_000;
const STATUS_POLL_INTERVAL_MS = 15_000;

export interface LocalPhoto {
    id: string;
    previewUrl: string;
    fileName: string;
    status: 'pending' | 'uploading' | 'done' | 'failed';
    error?: string;
}

export type SessionState = 'loading' | 'expired' | 'active' | 'done' | 'visit_created';

export interface MobilePhotoUploadLogic {
    context: MobileCheckinContext | null;
    sessionState: SessionState;
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
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [photos, setPhotos] = useState<LocalPhoto[]>([]);
    const [preparingCount, setPreparingCount] = useState(0);

    const isSyncingRef = useRef(false);
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
            setSessionState('expired');
        }
    }, [token]);

    useEffect(() => {
        initSession();
    }, [initSession]);

    // ─── Upload one photo ─────────────────────────────────────────────────────

    const uploadOne = useCallback(async (pending: PendingPhoto): Promise<void> => {
        await offlinePhotoDb.updateStatus(pending.id, 'uploading');
        setPhotos(prev => prev.map(p =>
            p.id === pending.id ? { ...p, status: 'uploading' as const } : p
        ));

        try {
            const blob = new Blob([pending.fileData], { type: pending.mimeType });
            await checkinApi.uploadMobilePhoto(blob, pending.fileName, token);
            await offlinePhotoDb.updateStatus(pending.id, 'done');
            setPhotos(prev => prev.map(p =>
                p.id === pending.id ? { ...p, status: 'done' as const, error: undefined } : p
            ));
        } catch (err) {
            const msg = describeUploadError(err);
            if (isSessionGoneError(err)) {
                setSessionState('expired');
            }
            await offlinePhotoDb.updateStatus(pending.id, 'failed', { error: msg });
            setPhotos(prev => prev.map(p =>
                p.id === pending.id ? { ...p, status: 'failed' as const, error: msg } : p
            ));
            throw err;
        }
    }, [token]);

    // ─── Sync all pending ─────────────────────────────────────────────────────

    const syncPending = useCallback(async () => {
        if (isSyncingRef.current || !isOnline) return;
        isSyncingRef.current = true;
        try {
            const pending = await offlinePhotoDb.getPendingByToken(token);
            for (const photo of pending) {
                try { await uploadOne(photo); } catch { /* continue */ }
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

    useEffect(() => {
        if (isOnline && sessionState === 'active') syncPending();
    }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Status polling: detect when desktop saves the visit ─────────────────

    useEffect(() => {
        if (sessionState !== 'active' && sessionState !== 'done') return;

        const poll = async () => {
            try {
                const status = await checkinApi.getMobileStatus(token);
                if (status.visitCreated) {
                    setSessionState('visit_created');
                }
            } catch {
                // network error: ignore, will retry next cycle
            }
        };

        const timer = setInterval(poll, STATUS_POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [sessionState, token]);

    // ─── Re-check the session when the page comes back to the foreground ──────
    //
    // Opening the camera, switching apps or locking the phone suspends this page; on
    // return the token may already be gone (visit saved on desktop, QR replaced). Verify
    // once instead of letting the next upload fail with an opaque error, and resume the
    // queue when the session is still alive.

    useEffect(() => {
        if (sessionState === 'loading' || sessionState === 'visit_created') return;

        const revalidate = async () => {
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
            try {
                const status = await checkinApi.getMobileStatus(token);
                if (status.visitCreated) { setSessionState('visit_created'); return; }
                if (!status.sessionActive) { setSessionState('expired'); return; }
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
    }, [token, sessionState, syncPending, initSession]);

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
    }, []);

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

                if (isOnline) uploadOne(record).catch(() => {});
            }
        } finally {
            if (unprocessed > 0) setPreparingCount(count => Math.max(0, count - unprocessed));
        }

        if (rejected.length > 0) alert(rejected.join('\n\n'));
    }, [token, isOnline, uploadOne]);

    const handleRetry = useCallback(async (photoId: string) => {
        const all = await offlinePhotoDb.getByToken(token);
        const record = all.find(p => p.id === photoId);
        if (!record) return;
        await offlinePhotoDb.updateStatus(photoId, 'pending');
        setPhotos(prev => prev.map(p =>
            p.id === photoId ? { ...p, status: 'pending' as const, error: undefined } : p
        ));
        if (isOnline) uploadOne({ ...record, status: 'pending' }).catch(() => {});
    }, [token, isOnline, uploadOne]);

    const handleRemove = useCallback(async (photoId: string, previewUrl: string) => {
        URL.revokeObjectURL(previewUrl);
        await offlinePhotoDb.remove(photoId);
        setPhotos(prev => prev.filter(p => p.id !== photoId));
    }, []);

    // ─── Derived ──────────────────────────────────────────────────────────────

    const doneCount = photos.filter(p => p.status === 'done').length;
    const totalCount = photos.length;
    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const hasPending = photos.some(p => p.status === 'pending' || p.status === 'failed');

    return {
        context,
        sessionState,
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
