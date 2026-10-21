import { useCallback, useId } from 'react';
import { queryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from '../api/checkinApi';

/**
 * Jedna sesja zdjęć na jeden kreator przyjęcia.
 *
 * `POST /photo-sessions` zakłada nowy wiersz w bazie, więc nie może się powtarzać.
 * Krok zdjęć odmontowuje się przy każdym przejściu między krokami; dawniej powrót
 * do niego zakładał nową, pustą sesję, a następne zdjęcie podmieniało listę w
 * formularzu na samą nową sesję - wcześniejsze zdjęcia wypadały z wizyty.
 *
 * Klucz niesie `scope` z kreatora (usePhotoSessionScope): następny kreator dostaje
 * własną sesję, a nie tę, którą poprzednia wizyta już zabrała.
 */
export const photoSessionQuery = (scope: string, appointmentId?: string) => queryOptions({
    queryKey: ['photo-session', 'create', scope, appointmentId ?? 'walk-in'],
    queryFn: () => checkinApi.createUploadSession(appointmentId),
    staleTime: Infinity,
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
});

/**
 * Wołane w kreatorze, który żyje dłużej niż krok zdjęć. Wyłączony obserwator trzyma
 * sesję w cache przez całe życie kreatora (bez obserwatora React Query usunąłby ją
 * po 5 minutach na innym kroku) i niczego nie wysyła.
 */
export const usePhotoSessionScope = (appointmentId?: string) => {
    const scope = useId();
    useQuery({ ...photoSessionQuery(scope, appointmentId), enabled: false });
    return scope;
};

// appointmentId jest opcjonalne: check-in „z marszu" (/checkin/new) robi zdjęcia,
// zanim istnieje rezerwacja - sesja powstaje wtedy bez powiązania z terminem.
export const usePhotoUpload = (scope: string, appointmentId?: string) => {
    const queryClient = useQueryClient();

    // Step 1: Create upload session (once per wizard, see photoSessionQuery)
    const { data: uploadSession, isLoading: isLoadingSession } = useQuery(photoSessionQuery(scope, appointmentId));

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
            try {
                await checkinApi.uploadToS3(uploadUrlResponse.uploadUrl, file);
            } catch (error) {
                // Serwer ma już rekord zdjęcia sesji. Zostawiony trafiał do listy, a potem
                // do zapisu wizyty, który wywracał się na kopiowaniu nieistniejącego pliku.
                await checkinApi.deletePhoto(uploadSession.sessionId, uploadUrlResponse.photoId).catch(() => undefined);
                throw error;
            }

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
        isUploading: uploadPhotoMutation.isPending,
        isDeleting: deletePhotoMutation.isPending,
        isRefreshing: isRefetching,
        uploadError: uploadPhotoMutation.error,
        deleteError: deletePhotoMutation.error,
    };
};
