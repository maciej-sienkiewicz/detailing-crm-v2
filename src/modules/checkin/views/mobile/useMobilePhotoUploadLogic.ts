// src/modules/checkin/views/mobile/useMobilePhotoUploadLogic.ts

import { useState, useRef, useEffect, useCallback } from 'react';
import { checkinApi } from '../../api/checkinApi';
import { offlinePhotoDb } from '../../services/offlinePhotoDb';
import type { MobileCheckinContext, PendingPhoto } from '../../types';

const RETRY_INTERVAL_MS = 30_000;
const STATUS_POLL_INTERVAL_MS = 15_000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

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

    const isSyncingRef = useRef(false);

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

    useEffect(() => {
        if (!token) { setSessionState('expired'); return; }

        const init = async () => {
            try {
                const ctx = await checkinApi.getMobileCheckinContext(token);
                setContext(ctx);
                setSessionState('active');

                const pending = await offlinePhotoDb.getByToken(token);
                const restored: LocalPhoto[] = pending.map(p => ({
                    id: p.id,
                    previewUrl: URL.createObjectURL(new Blob([p.fileData], { type: p.mimeType })),
                    fileName: p.fileName,
                    status: p.status === 'uploading' ? 'pending' : p.status as LocalPhoto['status'],
                    error: p.error,
                }));
                setPhotos(restored);
            } catch {
                setSessionState('expired');
            }
        };

        init();
    }, [token]);

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
            const msg = err instanceof Error ? err.message : 'Błąd przesyłania';
            if (msg.includes('403') || msg.toLowerCase().includes('token')) {
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
                // network error — ignore, will retry next cycle
            }
        };

        const timer = setInterval(poll, STATUS_POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [sessionState, token]);

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
        e.target.value = '';

        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                alert(`Nieobsługiwany format: ${file.type}. Używaj JPEG, PNG lub WebP.`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE_BYTES) {
                alert(`Plik "${file.name}" przekracza 10 MB.`);
                continue;
            }

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
        handleFileChange,
        handleRetry,
        handleRemove,
        handleMarkDone,
        handleUndoDone,
    };
}
