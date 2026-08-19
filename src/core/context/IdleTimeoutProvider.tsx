import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { UserSwitcherPanel } from '@/modules/pin-switcher';

interface IdleTimeoutContextType {
    resetTimer: () => void;
    /**
     * Whether the screen is currently locked behind the user-switcher panel.
     *
     * Exposed for session telemetry: a locked screen is the one moment when we know for
     * certain nobody is working, so the time-spent measurement must not count mouse
     * movement over the lock overlay as engaged time. Reading the sessionStorage key
     * directly from the telemetry module would couple it to this file's internals; a
     * context value is the seam that is meant to be depended on.
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
const LOCK_STORAGE_KEY = 'crm_session_locked';

export const IdleTimeoutProvider = ({ children }: Props) => {
    const { user, isAuthenticated } = useAuth();
    const [isLocked, setIsLocked] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const timeoutMs = (user?.idleTimeoutSeconds ?? 0) * 1000;
    const isActive = isAuthenticated && timeoutMs > 0;

    // Restore lock state from sessionStorage on authentication
    useEffect(() => {
        if (isAuthenticated && sessionStorage.getItem(LOCK_STORAGE_KEY) === '1') {
            setIsLocked(true);
        }
        if (!isAuthenticated) {
            sessionStorage.removeItem(LOCK_STORAGE_KEY);
            setIsLocked(false);
        }
    }, [isAuthenticated]);

    const lock = () => {
        sessionStorage.setItem(LOCK_STORAGE_KEY, '1');
        setIsLocked(true);
    };

    const resetTimer = () => {
        if (!isActive) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(lock, timeoutMs);
    };

    useEffect(() => {
        if (!isActive) {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (!sessionStorage.getItem(LOCK_STORAGE_KEY)) setIsLocked(false);
            return;
        }

        const handler = () => resetTimer();
        ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
        resetTimer();

        return () => {
            ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, handler));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, timeoutMs]);

    // Reset timer when tab becomes visible again
    useEffect(() => {
        if (!isActive) return;
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') resetTimer();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, timeoutMs]);

    const handleUnlock = () => {
        sessionStorage.removeItem(LOCK_STORAGE_KEY);
        setIsLocked(false);
        resetTimer();
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
