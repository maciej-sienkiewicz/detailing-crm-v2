import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { isNativeApp } from '@/core/native/platform';
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
        startNativePush(url => navigate(url)).catch(error => {
            console.warn('[push] Nie udało się odświeżyć powiadomień aplikacji', error);
        });
    }, [userId, navigate]);

    return null;
}
