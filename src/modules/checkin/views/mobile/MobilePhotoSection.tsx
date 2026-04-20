// src/modules/checkin/views/mobile/MobilePhotoSection.tsx

import {
    OfflineBanner,
    InfoCard,
    AllDoneCard,
    ProgressBar,
    ProgressFill,
    ProgressLabel,
    CameraBtn,
    HiddenInput,
    PhotoList,
    PhotoCard,
    PhotoImg,
    PhotoCardBody,
    PhotoCardHeader,
    PhotoCardTitle,
    StatusBadge,
    ErrorMsg,
    ActionRow,
    Btn,
} from './MobilePhotoUpload.styles';
import type { MobilePhotoUploadLogic } from './useMobilePhotoUploadLogic';

interface Props {
    logic: MobilePhotoUploadLogic;
}

export const MobilePhotoSection = ({ logic }: Props) => {
    const {
        isOnline,
        photos,
        doneCount,
        totalCount,
        progressPct,
        hasPending,
        handleFileChange,
        handleRetry,
        handleRemove,
    } = logic;

    return (
        <>
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
                    ✓ Wszystkie {totalCount}{' '}
                    {totalCount === 1 ? 'zdjęcie zostało' : 'zdjęcia zostały'} przesłane pomyślnie
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
        </>
    );
};
