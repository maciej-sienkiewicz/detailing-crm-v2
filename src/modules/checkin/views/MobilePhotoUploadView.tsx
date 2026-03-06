// src/modules/checkin/views/MobilePhotoUploadView.tsx

import { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { checkinApi } from '../api/checkinApi';
import { offlinePhotoDb } from '../services/offlinePhotoDb';
import type { MobileCheckinContext, PendingPhoto } from '../types';

// ─── Styled components ────────────────────────────────────────────────────────

const MobileContainer = styled.div`
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    padding: 16px;
    padding-bottom: 40px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const Header = styled.div`
    padding: 20px 0 16px;
    text-align: center;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    margin-bottom: 20px;
`;

const Logo = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    letter-spacing: 1px;
`;

const Title = styled.h1`
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
    color: white;
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: 14px;
    color: rgba(255,255,255,0.6);
`;

const InfoCard = styled.div`
    background: rgba(14, 165, 233, 0.12);
    border: 1px solid rgba(14, 165, 233, 0.3);
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 16px;
    font-size: 13px;
    color: rgba(255,255,255,0.85);
    line-height: 1.5;
`;

const OfflineBanner = styled.div<{ $visible: boolean }>`
    background: rgba(234, 179, 8, 0.15);
    border: 1px solid rgba(234, 179, 8, 0.4);
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 14px;
    font-size: 13px;
    font-weight: 500;
    color: #fbbf24;
    display: ${props => props.$visible ? 'flex' : 'none'};
    align-items: center;
    gap: 8px;
`;

const ProgressBar = styled.div`
    background: rgba(255,255,255,0.1);
    border-radius: 8px;
    height: 6px;
    overflow: hidden;
    margin-bottom: 6px;
`;

const ProgressFill = styled.div<{ $pct: number }>`
    height: 100%;
    width: ${props => props.$pct}%;
    background: linear-gradient(90deg, #0ea5e9, #38bdf8);
    border-radius: 8px;
    transition: width 0.4s ease;
`;

const ProgressLabel = styled.div`
    font-size: 12px;
    color: rgba(255,255,255,0.6);
    margin-bottom: 16px;
    text-align: center;
`;

const PhotoList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
`;

const PhotoCard = styled.div<{ $status: 'pending' | 'uploading' | 'done' | 'failed' }>`
    background: rgba(255,255,255,0.05);
    border: 2px solid ${props => {
        switch (props.$status) {
            case 'done':      return '#22c55e';
            case 'failed':    return '#ef4444';
            case 'uploading': return '#0ea5e9';
            default:          return 'rgba(255,255,255,0.12)';
        }
    }};
    border-radius: 14px;
    overflow: hidden;
    transition: border-color 0.3s;
`;

const PhotoImg = styled.img`
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    display: block;
`;

const PhotoCardBody = styled.div`
    padding: 12px 14px;
`;

const PhotoCardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
`;

const PhotoCardTitle = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.9);
`;

const StatusBadge = styled.span<{ $status: 'pending' | 'uploading' | 'done' | 'failed' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    background: ${props => {
        switch (props.$status) {
            case 'done':      return 'rgba(34, 197, 94, 0.2)';
            case 'failed':    return 'rgba(239, 68, 68, 0.2)';
            case 'uploading': return 'rgba(14, 165, 233, 0.2)';
            default:          return 'rgba(255,255,255,0.1)';
        }
    }};
    color: ${props => {
        switch (props.$status) {
            case 'done':      return '#22c55e';
            case 'failed':    return '#f87171';
            case 'uploading': return '#38bdf8';
            default:          return 'rgba(255,255,255,0.6)';
        }
    }};
`;

const ErrorMsg = styled.div`
    font-size: 12px;
    color: #f87171;
    margin-top: 6px;
`;

const ActionRow = styled.div`
    display: flex;
    gap: 8px;
`;

const Btn = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
    flex: 1;
    padding: 13px 10px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;

    &:active { transform: scale(0.97); }
    &:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

    background: ${props => {
        switch (props.$variant) {
            case 'secondary': return 'rgba(255,255,255,0.1)';
            case 'danger':    return 'rgba(239, 68, 68, 0.2)';
            default:          return 'linear-gradient(135deg, #0ea5e9, #0284c7)';
        }
    }};
    color: ${props => props.$variant === 'danger' ? '#f87171' : 'white'};
    border: ${props => props.$variant === 'danger' ? '1px solid rgba(239,68,68,0.3)' : 'none'};
`;

const CameraBtn = styled.label`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 18px;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white;
    border-radius: 14px;
    font-size: 17px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    box-shadow: 0 4px 20px rgba(14, 165, 233, 0.3);
    margin-bottom: 12px;
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;

    &:active { transform: scale(0.98); }

    svg { width: 24px; height: 24px; flex-shrink: 0; }
`;

const HiddenInput = styled.input`
    display: none;
`;

const ExpiredScreen = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: 20px;
    gap: 16px;
`;

const ExpiredIcon = styled.div`
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(239, 68, 68, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;

    svg { width: 36px; height: 36px; color: #f87171; }
`;

const ExpiredTitle = styled.h2`
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    color: white;
`;

const ExpiredText = styled.p`
    font-size: 15px;
    color: rgba(255,255,255,0.6);
    margin: 0;
    max-width: 300px;
    line-height: 1.6;
`;

const LoadingWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
    text-align: center;
`;

const Spinner = styled.div`
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.15);
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin { to { transform: rotate(360deg); } }
`;

const AllDoneCard = styled.div`
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    color: #86efac;
    font-size: 14px;
    margin-bottom: 12px;
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalPhoto {
    id: string;
    previewUrl: string;
    fileName: string;
    status: 'pending' | 'uploading' | 'done' | 'failed';
    error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RETRY_INTERVAL_MS = 30_000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ─── Component ────────────────────────────────────────────────────────────────

interface MobilePhotoUploadViewProps {
    token: string;
}

export const MobilePhotoUploadView = ({ token }: MobilePhotoUploadViewProps) => {
    const [context, setContext] = useState<MobileCheckinContext | null>(null);
    const [sessionState, setSessionState] = useState<'loading' | 'expired' | 'active'>('loading');
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

    // ─── Initialise: verify token & restore pending photos ───────────────────

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

    // ─── Upload a single photo ────────────────────────────────────────────────

    const uploadOne = useCallback(async (pending: PendingPhoto): Promise<void> => {
        await offlinePhotoDb.updateStatus(pending.id, 'uploading');
        setPhotos(prev =>
            prev.map(p => p.id === pending.id ? { ...p, status: 'uploading' as const } : p)
        );

        try {
            const blob = new Blob([pending.fileData], { type: pending.mimeType });
            await checkinApi.uploadMobilePhoto(blob, pending.fileName, token);
            await offlinePhotoDb.updateStatus(pending.id, 'done');
            setPhotos(prev =>
                prev.map(p => p.id === pending.id ? { ...p, status: 'done' as const, error: undefined } : p)
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Błąd przesyłania';
            const isTokenError = msg.includes('403') || msg.toLowerCase().includes('token');
            if (isTokenError) setSessionState('expired');
            await offlinePhotoDb.updateStatus(pending.id, 'failed', { error: msg });
            setPhotos(prev =>
                prev.map(p => p.id === pending.id ? { ...p, status: 'failed' as const, error: msg } : p)
            );
            throw err;
        }
    }, [token]);

    // ─── Sync all pending photos ──────────────────────────────────────────────

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

    // ─── Retry timer ──────────────────────────────────────────────────────────

    useEffect(() => {
        if (sessionState !== 'active') return;
        const timer = setInterval(syncPending, RETRY_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [sessionState, syncPending]);

    // ─── Sync when coming back online ─────────────────────────────────────────

    useEffect(() => {
        if (isOnline && sessionState === 'active') syncPending();
    }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Handle file selection ────────────────────────────────────────────────

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

    // ─── Derived counts ───────────────────────────────────────────────────────

    const doneCount = photos.filter(p => p.status === 'done').length;
    const totalCount = photos.length;
    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const hasPending = photos.some(p => p.status === 'pending' || p.status === 'failed');

    // ─── Render ───────────────────────────────────────────────────────────────

    if (sessionState === 'loading') {
        return (
            <MobileContainer>
                <LoadingWrap>
                    <Spinner />
                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>Weryfikacja sesji…</p>
                </LoadingWrap>
            </MobileContainer>
        );
    }

    if (sessionState === 'expired') {
        return (
            <MobileContainer>
                <ExpiredScreen>
                    <ExpiredIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </ExpiredIcon>
                    <ExpiredTitle>Sesja wygasła</ExpiredTitle>
                    <ExpiredText>
                        Link do przesyłania zdjęć wygasł lub jest nieprawidłowy.
                        Wygeneruj nowy kod QR na stanowisku obsługi.
                    </ExpiredText>
                </ExpiredScreen>
            </MobileContainer>
        );
    }

    return (
        <MobileContainer>
            <Header>
                <Logo>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    Dokumentacja pojazdu
                </Logo>
                <Title>Zrób zdjęcia pojazdu</Title>
                {context && (
                    <Subtitle>Sesja: {context.checkinId.slice(0, 8)}…</Subtitle>
                )}
            </Header>

            <OfflineBanner $visible={!isOnline}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                </svg>
                Tryb offline — zdjęcia zostaną wysłane po odzyskaniu połączenia
            </OfflineBanner>

            {totalCount > 0 && (
                <>
                    <ProgressBar>
                        <ProgressFill $pct={progressPct} />
                    </ProgressBar>
                    <ProgressLabel>
                        Wysłano {doneCount} z {totalCount} zdjęć
                        {hasPending && !isOnline ? ' · oczekuje na połączenie' : ''}
                    </ProgressLabel>
                </>
            )}

            {doneCount === totalCount && totalCount > 0 && !hasPending && (
                <AllDoneCard>
                    ✓ Wszystkie {totalCount} {totalCount === 1 ? 'zdjęcie zostało' : 'zdjęcia zostały'} przesłane pomyślnie
                </AllDoneCard>
            )}

            <InfoCard>
                Naciśnij przycisk poniżej, aby otworzyć aparat. Możesz dodać dowolną liczbę zdjęć.
            </InfoCard>

            <CameraBtn htmlFor="camera-input-mobile">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                </svg>
                Zrób zdjęcie / Dodaj z galerii
            </CameraBtn>
            <HiddenInput
                id="camera-input-mobile"
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleFileChange}
            />

            <PhotoList>
                {photos.map((photo, idx) => (
                    <PhotoCard key={photo.id} $status={photo.status}>
                        <PhotoImg src={photo.previewUrl} alt={`Zdjęcie ${idx + 1}`} loading="lazy" />
                        <PhotoCardBody>
                            <PhotoCardHeader>
                                <PhotoCardTitle>Zdjęcie #{photos.length - idx}</PhotoCardTitle>
                                <StatusBadge $status={photo.status}>
                                    {photo.status === 'done'      && '✓ Wysłane'}
                                    {photo.status === 'uploading' && '⟳ Wysyłanie…'}
                                    {photo.status === 'pending'   && '◷ Oczekujące'}
                                    {photo.status === 'failed'    && '✗ Błąd'}
                                </StatusBadge>
                            </PhotoCardHeader>

                            {photo.error && <ErrorMsg>{photo.error}</ErrorMsg>}

                            {(photo.status === 'pending' || photo.status === 'failed') && (
                                <ActionRow>
                                    {photo.status === 'failed' && (
                                        <Btn
                                            $variant="primary"
                                            onClick={() => handleRetry(photo.id)}
                                            disabled={!isOnline}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="23 4 23 10 17 10" />
                                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                            </svg>
                                            Ponów
                                        </Btn>
                                    )}
                                    <Btn
                                        $variant="danger"
                                        onClick={() => handleRemove(photo.id, photo.previewUrl)}
                                    >
                                        Usuń
                                    </Btn>
                                </ActionRow>
                            )}
                        </PhotoCardBody>
                    </PhotoCard>
                ))}
            </PhotoList>
        </MobileContainer>
    );
};
