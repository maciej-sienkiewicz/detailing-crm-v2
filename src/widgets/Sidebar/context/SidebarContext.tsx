import { createContext, useCallback, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { acquireScrollLock } from '@/common/utils/scrollLock';

interface SidebarContextValue {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    toggleCollapse: () => void;
    toggleMobileMenu: () => void;
    closeMobileMenu: () => void;
    /**
     * Widok, który potrzebuje szerokości (skrzynka Poczty i Zapytań na 1024-1279 px),
     * prosi o zwinięty pasek na czas, gdy jest otwarty. Zwraca funkcję oddającą prośbę.
     * Zapamiętany wybór użytkownika zostaje nietknięty, a ręczne rozwinięcie wygrywa
     * do końca wizyty w tym widoku.
     */
    requestCompact: () => () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

const STORAGE_KEY = 'sidebar-collapsed';

// Helper do bezpiecznego odczytu localStorage
const getStoredCollapsedState = (): boolean => {
    if (typeof window === 'undefined') return false;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'true';
    } catch {
        return false;
    }
};

interface SidebarProviderProps {
    children: ReactNode;
}

export const SidebarProvider = ({ children }: SidebarProviderProps) => {
    // Initialize with stored state synchronously
    const [storedCollapsed, setIsCollapsed] = useState(getStoredCollapsedState);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    // Liczba otwartych próśb o zwinięcie (requestCompact) i ręczne rozwinięcie w ich trakcie.
    const [compactRequests, setCompactRequests] = useState(0);
    const requestsRef = useRef(0);
    const [expandedOverride, setExpandedOverride] = useState(false);
    const compact = compactRequests > 0 && !expandedOverride;
    const isCollapsed = storedCollapsed || compact;

    // Persist to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(storedCollapsed));
        } catch {
            // TODO: handled error silently
        }
    }, [storedCollapsed]);

    // Blokada scrolla tła po otwarciu menu bocznego — wariant 'fixed', bo sam
    // `overflow: hidden` nie wystarcza w mobilnych przeglądarkach (zwłaszcza
    // iOS Safari): gesty dotyku dalej przesuwały viewport pod overlayem.
    // Zapamiętanie i przywrócenie pozycji scrolla oraz odporność na nałożenie
    // z blokadą okna modalnego załatwia współdzielony scrollLock; własny
    // zapis migawki stylów tutaj potrafił przywrócić `hidden` cudzej blokady.
    useEffect(() => {
        if (!isMobileOpen) return;
        return acquireScrollLock('fixed');
    }, [isMobileOpen]);

    const toggleCollapse = () => {
        if (compactRequests > 0) {
            // W widoku, który prosi o zwinięcie, ręczne rozwinięcie wygrywa z prośbą do końca
            // wizyty. Zapamiętany wybór zmienia się tylko wtedy, gdy to on trzymał pasek zwinięty.
            if (isCollapsed) {
                setExpandedOverride(true);
                setIsCollapsed(false);
            } else {
                setExpandedOverride(false);
            }
            return;
        }
        setIsCollapsed(prev => !prev);
    };
    const requestCompact = useCallback(() => {
        requestsRef.current += 1;
        setCompactRequests(requestsRef.current);
        let released = false;
        return () => {
            if (released) return;
            released = true;
            requestsRef.current = Math.max(0, requestsRef.current - 1);
            setCompactRequests(requestsRef.current);
            // Ostatnia prośba oddana - następna wizyta w widoku zaczyna od zwiniętego paska.
            if (requestsRef.current === 0) setExpandedOverride(false);
        };
    }, []);
    const toggleMobileMenu = () => setIsMobileOpen(prev => !prev);
    const closeMobileMenu = () => setIsMobileOpen(false);

    return (
        <SidebarContext.Provider
            value={{
                isCollapsed,
                isMobileOpen,
                toggleCollapse,
                toggleMobileMenu,
                closeMobileMenu,
                requestCompact,
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
};

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within SidebarProvider');
    }
    return context;
};