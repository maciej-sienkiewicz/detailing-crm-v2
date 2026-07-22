// src/modules/checkin/components/CheckinQRGenerator.tsx

import { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useCheckinQRToken } from '../hooks/useCheckinQRToken';
import { useCheckinSocket } from '../hooks/useCheckinSocket';
import { checkinApi } from '../api/checkinApi';
import type { CheckinPhotoUploadedEvent, CheckinDamageUpdatedEvent, DamagePoint } from '../types';

// ─── Styled components ────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const QrCard = styled.div`
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 20px;

    @media (max-width: 600px) {
        flex-direction: column;
        align-items: center;
    }
`;

const QrBox = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 160px;
    height: 160px;
    background: #fff;
    border-radius: 10px;
    padding: 8px;
`;

const QrSkeleton = styled(QrBox)`
    background: ${st.bg};
    border: 1px dashed ${st.border};
    color: ${st.textMuted};
    font-size: 12px;
    text-align: center;
`;

const QrInfo = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const QrTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${st.text};
`;

const QrSubtitle = styled.div`
    font-size: 12px;
    color: ${st.textMuted};
    line-height: 1.5;
`;

const Countdown = styled.div<{ $warn: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: ${st.radiusFull};
    font-size: 12px;
    font-weight: 600;
    background: ${props => props.$warn
        ? 'rgba(234, 179, 8, 0.12)'
        : 'rgba(5, 150, 105, 0.10)'};
    color: ${props => props.$warn ? '#d97706' : '#059669'};
    border: 1px solid ${props => props.$warn
        ? 'rgba(234, 179, 8, 0.30)'
        : 'rgba(5, 150, 105, 0.25)'};
    width: fit-content;
`;

const ExpiredBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: ${st.radiusFull};
    font-size: 12px;
    font-weight: 600;
    background: rgba(220, 38, 38, 0.10);
    color: #dc2626;
    border: 1px solid rgba(220, 38, 38, 0.25);
    width: fit-content;
`;

const RefreshBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: 1.5px solid ${st.accentBlue};
    border-radius: ${st.radiusSm};
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    width: fit-content;

    &:hover:not(:disabled) {
        background: ${st.accentBlue};
        color: #fff;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ErrorBox = styled.div`
    background: rgba(220, 38, 38, 0.07);
    border: 1px solid rgba(220, 38, 38, 0.25);
    border-radius: ${st.radiusSm};
    padding: 10px 14px;
    font-size: 13px;
    color: #dc2626;
`;

const SectionDivider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 4px 0;
`;

const PhotosHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
`;

const PhotosTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
    display: flex;
    align-items: center;
    gap: 7px;
`;

const CountChip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
`;

const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;

    @media (min-width: 640px) {
        grid-template-columns: repeat(4, 1fr);
    }
`;

const PhotoCard = styled.div<{ $new?: boolean }>`
    aspect-ratio: 4 / 3;
    border-radius: 8px;
    border: 1px solid ${props => props.$new ? st.accentBlue : st.border};
    overflow: hidden;
    position: relative;
    background: ${st.bgCardAlt};
    animation: ${props => props.$new ? 'fadeInScale 0.3s ease-out' : 'none'};

    @keyframes fadeInScale {
        from { opacity: 0; transform: scale(0.85); }
        to   { opacity: 1; transform: scale(1); }
    }

    &:hover .photo-overlay {
        opacity: 1;
    }
`;

const PhotoPlaceholder = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${st.bgCardAlt};
    color: ${st.textMuted};
    font-size: 11px;
    text-align: center;
    padding: 4px;
`;

const DeletePhotoBtn = styled.button`
    position: absolute;
    top: 4px;
    right: 4px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(220, 38, 38, 0.85);
    color: #fff;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    transition: background 150ms;
    z-index: 2;

    &:hover { background: #dc2626; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PhotoOverlay = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(15, 23, 42, 0.7));
    padding: 6px;
    opacity: 0;
    transition: opacity 200ms ease;
`;

const PhotoName = styled.span`
    font-size: 10px;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
`;

const NewBadge = styled.div`
    position: absolute;
    top: 4px;
    left: 4px;
    padding: 1px 6px;
    background: ${st.accentBlue};
    color: #fff;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
`;

// ─── Photo item type ──────────────────────────────────────────────────────────

interface QrPhoto {
    photoId: string;
    fileName: string;
    timestamp: string;
    thumbnailUrl?: string;
    isNew?: boolean;
}

// ─── Component props ──────────────────────────────────────────────────────────

interface CheckinQRGeneratorProps {
    appointmentId?: string;
    onDamageUpdated?: (points: DamagePoint[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CheckinQRGenerator = ({ appointmentId, onDamageUpdated }: CheckinQRGeneratorProps) => {
    const { tokenData, qrUrl, secondsLeft, isExpired, isLoading, error, refresh } =
        useCheckinQRToken(appointmentId);

    const [photos, setPhotos] = useState<QrPhoto[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const onDamageUpdatedRef = useRef(onDamageUpdated);
    onDamageUpdatedRef.current = onDamageUpdated;

    const handlePhotoUploaded = useCallback((event: CheckinPhotoUploadedEvent) => {
        setPhotos(prev => {
            if (prev.some(p => p.photoId === event.photoId)) return prev;
            return [
                { photoId: event.photoId, fileName: event.fileName, timestamp: event.timestamp, thumbnailUrl: event.thumbnailUrl, isNew: true },
                ...prev,
            ];
        });
        // Remove "new" badge after 3 seconds
        setTimeout(() => {
            setPhotos(prev =>
                prev.map(p => p.photoId === event.photoId ? { ...p, isNew: false } : p)
            );
        }, 3000);
    }, []);

    const handleDamageUpdated = useCallback((event: CheckinDamageUpdatedEvent) => {
        onDamageUpdatedRef.current?.(event.damagePoints);
    }, []);

    useCheckinSocket({
        checkinId: tokenData?.checkinId ?? null,
        onPhotoUploaded: handlePhotoUploaded,
        onDamageUpdated: handleDamageUpdated,
        enabled: !!tokenData && !isExpired,
    });

    const handleDeletePhoto = async (photoId: string) => {
        if (!tokenData?.checkinId) return;
        setDeletingId(photoId);
        try {
            await checkinApi.deleteCheckinPhoto(tokenData.checkinId, photoId);
            setPhotos(prev => prev.filter(p => p.photoId !== photoId));
        } catch {
            // Silent fail — photo stays in list
        } finally {
            setDeletingId(null);
        }
    };

    const warnCountdown = secondsLeft > 0 && secondsLeft < 5 * 60; // warn at < 5 min

    return (
        <Wrap>
            <QrCard>
                <QrBox>
                    {isLoading && <QrSkeleton>Generowanie kodu QR…</QrSkeleton>}
                    {!isLoading && error && <QrSkeleton>Błąd</QrSkeleton>}
                    {!isLoading && !error && qrUrl && !isExpired && (
                        <QRCodeSVG value={qrUrl} size={144} level="M" />
                    )}
                    {!isLoading && !error && isExpired && (
                        <QrSkeleton>Kod wygasł</QrSkeleton>
                    )}
                </QrBox>

                <QrInfo>
                    <QrTitle>Zeskanuj, aby przesłać zdjęcia telefonem</QrTitle>
                    <QrSubtitle>
                        Pracownik może zeskanować kod QR i sfotografować pojazd telefonem.
                        Zdjęcia pojawią się tu automatycznie.
                    </QrSubtitle>

                    {!isLoading && !error && !isExpired && secondsLeft > 0 && (
                        <Countdown $warn={warnCountdown}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Ważny jeszcze {formatCountdown(secondsLeft)}
                        </Countdown>
                    )}

                    {isExpired && (
                        <ExpiredBadge>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            Kod wygasł
                        </ExpiredBadge>
                    )}

                    {(isExpired || warnCountdown || error) && (
                        <RefreshBtn onClick={refresh} disabled={isLoading}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23 4 23 10 17 10" />
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            {isLoading ? 'Generowanie…' : 'Odśwież kod QR'}
                        </RefreshBtn>
                    )}

                    {error && <ErrorBox>{error}</ErrorBox>}
                </QrInfo>
            </QrCard>

            {photos.length > 0 && (
                <>
                    <SectionDivider />
                    <div>
                        <PhotosHeader>
                            <PhotosTitle>
                                Zdjęcia z telefonu
                                <CountChip>{photos.length}</CountChip>
                            </PhotosTitle>
                        </PhotosHeader>
                        <PhotoGrid>
                            {photos.map(photo => (
                                <PhotoCard key={photo.photoId} $new={photo.isNew}>
                                    {photo.thumbnailUrl ? (
                                        <img
                                            src={photo.thumbnailUrl}
                                            alt={photo.fileName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }}
                                        />
                                    ) : (
                                        <PhotoPlaceholder>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                <circle cx="12" cy="13" r="4" />
                                            </svg>
                                        </PhotoPlaceholder>
                                    )}
                                    {photo.isNew && <NewBadge>Nowe</NewBadge>}
                                    <DeletePhotoBtn
                                        onClick={() => handleDeletePhoto(photo.photoId)}
                                        disabled={deletingId === photo.photoId}
                                        title="Usuń zdjęcie"
                                    >
                                        ×
                                    </DeletePhotoBtn>
                                    <PhotoOverlay className="photo-overlay">
                                        <PhotoName>{photo.fileName}</PhotoName>
                                    </PhotoOverlay>
                                </PhotoCard>
                            ))}
                        </PhotoGrid>
                    </div>
                </>
            )}
        </Wrap>
    );
};
