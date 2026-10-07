import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { onLockSignal } from '../sessionLock';
import { UserSwitcherPanel } from '@/modules/pin-switcher';

/**
 * „Sesja zablokowana" w karcie otwartej, gdy sesja była już zablokowana.
 *
 * Zamiast aplikacji, nie nad nią: /auth/me zablokowanej sesji nie oddaje uprawnień,
 * a każde zapytanie o dane kończy się 423, więc pod spodem i tak nie byłoby czego
 * pokazać. Dawniej ta karta po prostu nie wiedziała o blokadzie innej karty
 * (zgłoszenie z 07.10). Udany PIN podmienia użytkownika w AuthContext
 * (`sessionLocked` znika) i ProtectedRoute pokazuje aplikację.
 */
export function SessionLockedScreen() {
    const { refreshUser } = useAuth();

    // Odblokowano PIN-em w innej karcie - ta pyta serwer, kto teraz jest zalogowany.
    useEffect(() => onLockSignal(locked => {
        if (!locked) void refreshUser();
    }), [refreshUser]);

    return <UserSwitcherPanel lockMode onClose={() => {}} />;
}
