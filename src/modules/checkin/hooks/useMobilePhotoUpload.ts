import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { checkinApi } from '../api/checkinApi';
import type { UploadPhotoPayload } from '../types';

export const useMobilePhotoUpload = () => {
    const [uploadError, setUploadError] = useState<string | null>(null);

    const validateSessionMutation = useMutation({
        mutationFn: ({ sessionId, token }: { sessionId: string; token: string }) =>
            checkinApi.validateSession(sessionId, token),
    });

    const uploadPhotoMutation = useMutation({
        mutationFn: (payload: UploadPhotoPayload) =>
            checkinApi.uploadPhoto(payload),
        onSuccess: () => {
            setUploadError(null);
        },
        onError: (error: Error) => {
            setUploadError(error.message || 'Błąd podczas wgrywania zdjęcia');
        },
    });

    const validateSession = async (sessionId: string, token: string): Promise<boolean> => {
        try {
            const result = await validateSessionMutation.mutateAsync({ sessionId, token });
            return result;
        } catch {
            return false;
        }
    };

    const uploadPhoto = async (payload: UploadPhotoPayload): Promise<boolean> => {
        try {
            await uploadPhotoMutation.mutateAsync(payload);
            return true;
        } catch {
            return false;
        }
    };

    return {
        validateSession,
        uploadPhoto,
        isValidating: validateSessionMutation.isPending,
        isUploading: uploadPhotoMutation.isPending,
        uploadError,
    };
};