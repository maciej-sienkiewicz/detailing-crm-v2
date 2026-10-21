import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { isNativeApp } from '@/core/native/platform';
import { describeError, logger } from '@/core/logger';
import { startNativePush } from './nativePush';

/**
 * Powiadomienia aplikacji ze sklepu po zalogowaniu: odświeżony token na serwerze
 * i otwieranie ekranu po stuknięciu. Zależy od osoby, nie od wejścia na stronę -
 * przełączenie PIN-em przepisuje telefon na tego, kto teraz przy nim stoi.
 */
export function NativePushBridge() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const userId = user?.userId;

    useEffect(() => {
        if (!isNativeApp() || !userId) return;
        // describeError: bez treści żądania, czyli bez tokenu FCM/APNs urządzenia.
        startNativePush(url => navigate(url)).catch(error => {
            logger.warn('push.native_refresh_failed', describeError(error));
        });
    }, [userId, navigate]);

    return null;
}
