import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { checkinApi } from '../api/checkinApi';
import type { PhotoSlot } from '../types';

export const usePhotoUpload = (reservationId: string) => {
    const [photos, setPhotos] = useState<PhotoSlot[]>([]);

    const { data: uploadSession, isLoading: isLoadingSession } = useQuery({
        queryKey: ['checkin', 'upload-session', reservationId],
        queryFn: () => checkinApi.createUploadSession(reservationId),
        staleTime: 3600000,
    });

    const {
        data: sessionPhotos,
        refetch: refetchPhotos,
        isRefetching,
    } = useQuery({
        queryKey: ['checkin', 'session-photos', uploadSession?.sessionId],
        queryFn: () => checkinApi.getSessionPhotos(uploadSession!.sessionId),
        enabled: !!uploadSession?.sessionId,
        staleTime: 0,
    });

    useEffect(() => {
        if (sessionPhotos) {
            setPhotos(sessionPhotos);
        }
    }, [sessionPhotos]);

    const refreshPhotos = async () => {
        const result = await refetchPhotos();
        if (result.data) {
            setPhotos(result.data);
        }
    };

    return {
        uploadSession,
        photos,
        refreshPhotos,
        isLoading: isLoadingSession,
        isRefreshing: isRefetching,
    };
};
