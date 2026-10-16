import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from '../api/checkinApi';
import type { PhotoSlot } from '../types';

/** Prefiks wpisu sesji zdjęć w cache - zdejmuje go CheckInWizardView przy wyjściu z przyjęcia. */
export const PHOTO_SESSION_CREATE_KEY = ['photo-session', 'create'] as const;

// appointmentId jest opcjonalne: check-in „z marszu" (/checkin/new) robi zdjęcia,
// zanim istnieje rezerwacja - sesja powstaje wtedy bez powiązania z terminem.
// wizardKey to id JEDNEGO przyjęcia (qrCheckinId), żeby dwa przyjęcia nie dzieliły sesji.
export const usePhotoUpload = (appointmentId?: string, wizardKey?: string) => {
    const queryClient = useQueryClient();

    // Step 1: Create upload session - JEDNA na całe przyjęcie. Krok zdjęć montuje się
    // od nowa przy każdym „Wstecz"/„Dalej" (key={currentStep}), a przy domyślnym
    // staleTime zapytanie wysyłało wtedy POST jeszcze raz i dostawało NOWĄ, pustą
    // sesję. Pierwsze zdjęcie dodane potem zastępowało w formularzu wszystkie
    // wcześniejsze, więc dowód uszkodzeń sprzed przyjęcia nie trafiał do wizyty.
    const {
        data: uploadSession,
        isLoading: isLoadingSession,
        isError: isSessionError,
        refetch: retrySession,
    } = useQuery({
        queryKey: [...PHOTO_SESSION_CREATE_KEY, wizardKey ?? appointmentId ?? 'walk-in'],
        queryFn: () => checkinApi.createUploadSession(appointmentId),
        staleTime: Infinity,
        gcTime: Infinity,
    });

    // Get session photos
    const {
        data: sessionPhotosData,
        refetch: refetchPhotos,
        isRefetching,
    } = useQuery({
        queryKey: ['photo-session', uploadSession?.sessionId, 'photos'],
        queryFn: () => checkinApi.getSessionPhotos(uploadSession!.sessionId),
        enabled: !!uploadSession?.sessionId,
    });

    const photos = sessionPhotosData?.photos || [];

    // Upload photo mutation
    const uploadPhotoMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!uploadSession) {
                throw new Error('Upload session not initialized');
            }

            // Step 2: Get presigned upload URL
            const uploadUrlResponse = await checkinApi.generateUploadUrl(
                uploadSession.sessionId,
                {
                    fileName: file.name,
                    contentType: file.type,
                    fileSize: file.size,
                    sessionToken: uploadSession.token,
                }
            );

            // Step 3: Upload directly to S3
            await checkinApi.uploadToS3(uploadUrlResponse.uploadUrl, file);

            return uploadUrlResponse.photoId;
        },
        onSuccess: () => {
            // Refresh photos list after successful upload
            queryClient.invalidateQueries({
                queryKey: ['photo-session', uploadSession?.sessionId, 'photos'],
            });
        },
    });

    // Delete photo mutation
    const deletePhotoMutation = useMutation({
        mutationFn: async (photoId: string) => {
            if (!uploadSession) {
                throw new Error('Upload session not initialized');
            }
            await checkinApi.deletePhoto(uploadSession.sessionId, photoId);
        },
        onSuccess: () => {
            // Refresh photos list after deletion
            queryClient.invalidateQueries({
                queryKey: ['photo-session', uploadSession?.sessionId, 'photos'],
            });
        },
    });

    const uploadPhoto = useCallback(
        async (file: File): Promise<string> => {
            return uploadPhotoMutation.mutateAsync(file);
        },
        [uploadPhotoMutation]
    );

    const deletePhoto = useCallback(
        async (photoId: string): Promise<void> => {
            await deletePhotoMutation.mutateAsync(photoId);
        },
        [deletePhotoMutation]
    );

    const refreshPhotos = useCallback(async () => {
        await refetchPhotos();
    }, [refetchPhotos]);

    return {
        uploadSession,
        photos,
        uploadPhoto,
        deletePhoto,
        refreshPhotos,
        isLoading: isLoadingSession,
        isSessionError,
        retrySession,
        isUploading: uploadPhotoMutation.isPending,
        isDeleting: deletePhotoMutation.isPending,
        isRefreshing: isRefetching,
        uploadError: uploadPhotoMutation.error,
        deleteError: deletePhotoMutation.error,
    };
};
