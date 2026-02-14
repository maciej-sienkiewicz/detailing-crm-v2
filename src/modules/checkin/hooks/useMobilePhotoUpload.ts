import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { checkinApi } from '../api/checkinApi';

interface UploadPhotoParams {
    sessionId: string;
    token: string;
    photo: File;
}

export const useMobilePhotoUpload = () => {
    const [uploadError, setUploadError] = useState<string | null>(null);

    const uploadPhotoMutation = useMutation({
        mutationFn: async ({ sessionId, token, photo }: UploadPhotoParams) => {
            // Step 1: Get presigned upload URL
            const uploadUrlResponse = await checkinApi.generateUploadUrl(
                sessionId,
                {
                    fileName: photo.name,
                    contentType: photo.type,
                    fileSize: photo.size,
                    sessionToken: token,
                }
            );

            // Step 2: Upload directly to S3
            await checkinApi.uploadToS3(uploadUrlResponse.uploadUrl, photo);

            return uploadUrlResponse.photoId;
        },
        onSuccess: () => {
            setUploadError(null);
        },
        onError: (error: Error) => {
            setUploadError(error.message || 'Błąd podczas wgrywania zdjęcia');
        },
    });

    const validateSession = async (sessionId: string, token: string): Promise<boolean> => {
        // Try to generate an upload URL as a validation check
        // If it succeeds, the session is valid
        try {
            // We can't actually validate without uploading, so we'll assume it's valid
            // The actual validation will happen when the user tries to upload
            return !!sessionId && !!token;
        } catch {
            return false;
        }
    };

    const uploadPhoto = async (params: UploadPhotoParams): Promise<boolean> => {
        try {
            await uploadPhotoMutation.mutateAsync(params);
            return true;
        } catch {
            return false;
        }
    };

    return {
        validateSession,
        uploadPhoto,
        isValidating: false, // No longer needed since we don't have a separate validation endpoint
        isUploading: uploadPhotoMutation.isPending,
        uploadError,
    };
};