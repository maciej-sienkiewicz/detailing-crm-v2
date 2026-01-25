import { useEffect } from 'react';
import { useSidebar } from './context/SidebarContext';
import { SidebarMenu, MenuSection } from './SidebarMenu';
import {
    Overlay,
    SidebarContainer,
    SidebarHeader,
    Logo,
    LogoIcon,
    LogoText,
    HeaderActions,
    CollapseButton,
    CloseButton,
    SidebarFooter,
    ExpandButton,
    MobileMenuButton,
} from './SidebarStyles';

const menuSections: MenuSection[] = [
    {
        title: 'Główne',
        items: [
            { path: '/dashboard', label: 'Dashboard', icon: '◉' },
            { path: '/calendar', label: 'Kalendarz', icon: '◳' },
            { path: '/leads', label: 'Leady', icon: '◈' },
            { path: '/operations', label: 'Wizyty', icon: '◷', badge: '3' },
            { path: '/customers', label: 'Klienci', icon: '◇' },
        ],
    },
    {
        title: 'Zarządzanie',
        items: [
            { path: '/vehicles', label: 'Pojazdy', icon: '▣' },
            { path: '/services', label: 'Usługi', icon: '◐' },
            { path: '/invoices', label: 'Faktury', icon: '◫' },
            { path: '/appointment-colors', label: 'Raporty', icon: '◧' },
        ],
    },
    {
        title: 'System',
        items: [
            { path: '/consents', label: 'Zgody', icon: '◎' },
            { path: '/protocols', label: 'Protokoły', icon: '◰' },
            { path: '/team', label: 'Zespół', icon: '◕' },
        ],
    },
];

export const Sidebar = () => {
    const { isCollapsed, isMobileOpen, toggleCollapse, toggleMobileMenu, closeMobileMenu } = useSidebar();

    // Close on ESC
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isMobileOpen) {
                closeMobileMenu();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isMobileOpen, closeMobileMenu]);

    return (
        <>
            <MobileMenuButton onClick={toggleMobileMenu} aria-label="Otwórz menu">
                ☰
            </MobileMenuButton>

            <Overlay $isVisible={isMobileOpen} onClick={closeMobileMenu} />

            <SidebarContainer $isCollapsed={isCollapsed} $isMobileOpen={isMobileOpen}>
                <SidebarHeader $isCollapsed={isCollapsed}>
                    <Logo $isCollapsed={isCollapsed}>
                        <LogoIcon>A</LogoIcon>
                        <LogoText $isCollapsed={isCollapsed}>AutoCRM</LogoText>
                    </Logo>
                    <HeaderActions>
                        <CollapseButton
                            onClick={toggleCollapse}
                            title="Zwiń menu"
                            $isCollapsed={isCollapsed}
                        >
                            ‹
                        </CollapseButton>
                        <CloseButton onClick={closeMobileMenu} aria-label="Zamknij menu">
                            ✕
                        </CloseButton>
                    </HeaderActions>
                </SidebarHeader>

                <SidebarMenu
                    sections={menuSections}
                    isCollapsed={isCollapsed}
                    onNavigate={closeMobileMenu}
                />

                <SidebarFooter $isCollapsed={isCollapsed}>
                    <div>v1.0.0</div>
                </SidebarFooter>

                {isCollapsed && (
                    <ExpandButton onClick={toggleCollapse} title="Rozwiń menu">
                        ›
                    </ExpandButton>
                )}
            </SidebarContainer>
        </>
    );
};