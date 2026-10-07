import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { UserSwitcherPanel } from '@/modules/pin-switcher';
import { authApi } from '@/modules/auth/api/authApi';
import {
    SESSION_LOCKED_EVENT, announceLock, lastSharedActivity, onLockSignal, recordActivity,
} from '../sessionLock';

interface IdleTimeoutContextType {
    resetTimer: () => void;
    /**
     * Whether the screen is currently locked behind the user-switcher panel.
     *
     * A context value rather than a storage key read from the outside: consumers
     * that need to know "nobody is at the keyboard right now" depend on this seam instead
     * of on this file's internals.
     */
    isLocked: boolean;
}

const IdleTimeoutContext = createContext<IdleTimeoutContextType>({
    resetTimer: () => {},
    isLocked: false,
});

export const useIdleTimeout = () => useContext(IdleTimeoutContext);

interface Props {
    children: ReactNode;
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

/**
 * „Sesja zablokowana" po bezczynności - w karcie, w której aplikacja już działa.
 *
 * Blokada żyje na serwerze (sessionLock.ts): zakłada ją `authApi.lockSession()`, a od tej
 * chwili serwer odmawia danych tej sesji w KAŻDEJ karcie. Dawniej była flagą
 * `sessionStorage` tej jednej karty i nową kartę wystarczyło otworzyć, żeby ją ominąć
 * (zgłoszenie z 07.10). Nowa karta zablokowanej sesji w ogóle nie dochodzi do tego
 * komponentu - ekran blokady pokazuje jej ProtectedRoute (`user.sessionLocked`).
 *
 * Tutaj blokada jest NAKŁADKĄ, a aplikacja pod nią zostaje zamontowana: kto wróci
 * i wpisze PIN, ma przed sobą swój niedokończony formularz.
 */
export const IdleTimeoutProvider = ({ children }: Props) => {
    const { user, isAuthenticated, refreshUser } = useAuth();
    const queryClient = useQueryClient();
    const [isLocked, setIsLocked] = useState(false);
    const lockedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActivityRef = useRef(Date.now());

    const timeoutMs = (user?.idleTimeoutSeconds ?? 0) * 1000;
    const isActive = isAuthenticated && timeoutMs > 0;

    const setLocked = (value: boolean) => {
        lockedRef.current = value;
        setIsLocked(value);
    };

    const clearTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
    };

    const lock = () => {
        if (lockedRef.current) return;
        setLocked(true);
        clearTimer();
        announceLock();
        void authApi.lockSession().catch(() => {
            /* Bez sieci blokada zostaje na ekranie; serwer dostanie ją przy następnej próbie. */
        });
    };

    // Bezczynność liczy się od ostatniej aktywności w KTÓREJKOLWIEK karcie: karta w tle
    // nie zablokuje sesji komuś, kto właśnie pracuje w drugiej.
    const check = () => {
        if (lockedRef.current || !isActive) return;
        const last = Math.max(lastActivityRef.current, lastSharedActivity());
        const idle = Date.now() - last;
        if (idle >= timeoutMs) {
            lock();
            return;
        }
        clearTimer();
        timerRef.current = setTimeout(check, timeoutMs - idle);
    };

    const resetTimer = () => {
        if (!isActive || lockedRef.current) return;
        lastActivityRef.current = Date.now();
        recordActivity(lastActivityRef.current);
        clearTimer();
        timerRef.current = setTimeout(check, timeoutMs);
    };

    useEffect(() => {
        if (!isAuthenticated) setLocked(false);
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isActive) {
            clearTimer();
            return;
        }

        const handler = () => {
            if (lockedRef.current) return;
            lastActivityRef.current = Date.now();
            recordActivity(lastActivityRef.current);
        };
        ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
        resetTimer();

        return () => {
            ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, handler));
            clearTimer();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, timeoutMs]);

    // Powrót do karty: przeglądarka dławi timery kart w tle, więc sprawdzamy od razu.
    useEffect(() => {
        if (!isActive) return;
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') check();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, timeoutMs]);

    // Blokada i odblokowanie przychodzą też z zewnątrz: z innej karty (sygnał) albo od
    // serwera (423 SESSION_LOCKED na dowolnym zapytaniu). Niezależnie od tego, czy ta
    // karta sama liczy bezczynność.
    useEffect(() => {
        if (!isAuthenticated) return;
        const onServerLocked = () => setLocked(true);
        window.addEventListener(SESSION_LOCKED_EVENT, onServerLocked);
        const unsubscribe = onLockSignal(locked => {
            if (locked) {
                setLocked(true);
                clearTimer();
                return;
            }
            // Odblokowano PIN-em w innej karcie - mogła wejść inna osoba, więc najpierw
            // jej dane i uprawnienia, potem dane widoków odrzucone w czasie blokady.
            void refreshUser().then(() => queryClient.invalidateQueries());
            setLocked(false);
            resetTimer();
        });
        return () => {
            window.removeEventListener(SESSION_LOCKED_EVENT, onServerLocked);
            unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, isActive, timeoutMs]);

    // Udany PIN w tej karcie (panel sam ustawia nowego użytkownika i daje znać innym kartom).
    const handleUnlock = () => {
        setLocked(false);
        recordActivity(Date.now(), true);
        resetTimer();
        // Zapytania odrzucone w czasie blokady (423) wracają po dane.
        void queryClient.invalidateQueries();
    };

    return (
        <IdleTimeoutContext.Provider value={{ resetTimer, isLocked }}>
            {children}
            {isLocked && (
                <UserSwitcherPanel onClose={handleUnlock} lockMode />
            )}
        </IdleTimeoutContext.Provider>
    );
};
