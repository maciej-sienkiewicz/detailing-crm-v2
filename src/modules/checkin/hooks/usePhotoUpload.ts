import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from '../api/checkinApi';
import type { PhotoSlot } from '../types';

export const usePhotoUpload = (appointmentId: string) => {
    const queryClient = useQueryClient();

    // Step 1: Create upload session
    const { data: uploadSession, isLoading: isLoadingSession } = useQuery({
        queryKey: ['photo-session', appointmentId],
        queryFn: () => checkinApi.createUploadSession(appointmentId),
        staleTime: 3600000, // 1 hour
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
        staleTime: 0, // Always fresh
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
        isUploading: uploadPhotoMutation.isPending,
        isDeleting: deletePhotoMutation.isPending,
        isRefreshing: isRefetching,
        uploadError: uploadPhotoMutation.error,
        deleteError: deletePhotoMutation.error,
    };
};
