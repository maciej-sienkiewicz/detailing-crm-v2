import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { UserSwitcherPanel } from '@/modules/pin-switcher';

interface IdleTimeoutContextType {
    resetTimer: () => void;
}

const IdleTimeoutContext = createContext<IdleTimeoutContextType>({ resetTimer: () => {} });

export const useIdleTimeout = () => useContext(IdleTimeoutContext);

interface Props {
    children: ReactNode;
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

export const IdleTimeoutProvider = ({ children }: Props) => {
    const { user, isAuthenticated } = useAuth();
    const [isLocked, setIsLocked] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const timeoutMs = (user?.idleTimeoutMinutes ?? 0) * 60 * 1000;
    const isActive = isAuthenticated && timeoutMs > 0;

    const resetTimer = () => {
        if (!isActive) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setIsLocked(true), timeoutMs);
    };

    useEffect(() => {
        if (!isActive) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setIsLocked(false);
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

    // When locked, also lock on visibility change (tab switch back)
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
        setIsLocked(false);
        resetTimer();
    };

    return (
        <IdleTimeoutContext.Provider value={{ resetTimer }}>
            {children}
            {isLocked && (
                <UserSwitcherPanel onClose={handleUnlock} lockMode />
            )}
        </IdleTimeoutContext.Provider>
    );
};
