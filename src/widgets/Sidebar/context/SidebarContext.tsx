import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { acquireScrollLock } from '@/common/utils/scrollLock';

interface SidebarContextValue {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    toggleCollapse: () => void;
    toggleMobileMenu: () => void;
    closeMobileMenu: () => void;
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
    const [isCollapsed, setIsCollapsed] = useState(getStoredCollapsedState);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Persist to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(isCollapsed));
        } catch {
            // TODO: handled error silently
        }
    }, [isCollapsed]);

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

    const toggleCollapse = () => setIsCollapsed(prev => !prev);
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