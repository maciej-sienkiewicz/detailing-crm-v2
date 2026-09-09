import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

    // Blokada scrolla tła po otwarciu menu bocznego.
    //
    // Sam `overflow: hidden` na <body> nie wystarcza w mobilnych przeglądarkach
    // (zwłaszcza iOS Safari): gesty dotyku dalej przesuwają viewport, więc palcem
    // można było scrollować treść pod overlayem, co dezorientuje. Sztywnym stopem
    // jest `position: fixed` na <body> - viewport nie ma już czego przewijać.
    // Zapamiętujemy aktualną pozycję scrolla, po zamknięciu przywracamy ją, żeby
    // użytkownik nie wracał na górę strony.
    useEffect(() => {
        if (!isMobileOpen) return;

        const scrollY = window.scrollY;
        const body = document.body;
        const prev = {
            position: body.style.position,
            top: body.style.top,
            left: body.style.left,
            right: body.style.right,
            width: body.style.width,
            overflow: body.style.overflow,
        };

        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.overflow = 'hidden';

        return () => {
            body.style.position = prev.position;
            body.style.top = prev.top;
            body.style.left = prev.left;
            body.style.right = prev.right;
            body.style.width = prev.width;
            body.style.overflow = prev.overflow;
            window.scrollTo(0, scrollY);
        };
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