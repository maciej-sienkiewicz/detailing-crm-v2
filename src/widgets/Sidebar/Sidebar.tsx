import { useEffect } from 'react';
import {
    LayoutDashboard,
    Calendar,
    CalendarCheck,
    Users,
    Car,
    Images,
    BarChart3,
    TrendingUp,
    MessageSquare,
    FileText,
    UserCog,
    PanelLeftClose,
    PanelLeftOpen,
    X,
    Menu,
    InstagramIcon,
    Search,
    Settings,
    LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from './context/SidebarContext';
import { useAuth } from '@/core/context/AuthContext';
import { authApi } from '@/modules/auth/api/authApi';
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
    VersionRow,
    StatusDot,
    VersionText,
    ExpandButton,
    MobileMenuButton,
    FooterMenuLink,
    FooterMenuButton,
    MenuItemIcon,
    MenuItemText,
} from './SidebarStyles';

const menuSections: MenuSection[] = [
    {
        title: 'Główne',
        items: [
            { path: '/dashboard',  label: 'Tablica',   icon: LayoutDashboard },
            { path: '/operations', label: 'Wizyty',    icon: CalendarCheck },
            { path: '/calendar',   label: 'Kalendarz', icon: Calendar },
        ],
    },
    {
        title: 'Baza klientów',
        items: [
            { path: '/customers', label: 'Klienci',   icon: Users },
            { path: '/vehicles',  label: 'Samochody', icon: Car },
        ],
    },
    {
        title: 'Administracja',
        items: [
            { path: '/finances',  label: 'Finanse',  icon: FileText },
            { path: '/reports',    label: 'Raporty',    icon: BarChart3 },
            { path: '/statistics', label: 'Statystyki', icon: TrendingUp },
            { path: '/team',       label: 'Pracownicy', icon: UserCog },
            { path: '/gallery',    label: 'Galeria',    icon: Images },
        ],
    },
    {
        title: 'Marketing',
        items: [
            { path: '/sms-campaigns',  label: 'Kampanie SMS', icon: MessageSquare },
            { path: '/instagram',      label: 'Instagram',    icon: InstagramIcon },
            { path: '/google-reviews', label: 'Google',       icon: Search },
        ],
    },
];

export const Sidebar = () => {
    const { isCollapsed, isMobileOpen, toggleCollapse, toggleMobileMenu, closeMobileMenu } = useSidebar();
    const { setAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isMobileOpen) closeMobileMenu();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isMobileOpen, closeMobileMenu]);

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch {
            // ignore errors, proceed with logout
        }
        setAuthenticated(false);
        navigate('/login');
    };

    return (
        <>
            <MobileMenuButton onClick={toggleMobileMenu} aria-label="Otwórz menu">
                <Menu />
            </MobileMenuButton>

            <Overlay $isVisible={isMobileOpen} onClick={closeMobileMenu} />

            <SidebarContainer $isCollapsed={isCollapsed} $isMobileOpen={isMobileOpen}>
                <SidebarHeader $isCollapsed={isCollapsed}>
                    <Logo $isCollapsed={isCollapsed}>
                        <LogoIcon>AC</LogoIcon>
                        <LogoText $isCollapsed={isCollapsed}>AutoCRM</LogoText>
                    </Logo>
                    <HeaderActions>
                        <CollapseButton
                            onClick={toggleCollapse}
                            title="Zwiń menu"
                            $isCollapsed={isCollapsed}
                        >
                            <PanelLeftClose />
                        </CollapseButton>
                        <CloseButton onClick={closeMobileMenu} aria-label="Zamknij menu">
                            <X />
                        </CloseButton>
                    </HeaderActions>
                </SidebarHeader>

                <SidebarMenu
                    sections={menuSections}
                    isCollapsed={isCollapsed}
                    onNavigate={closeMobileMenu}
                />

                <SidebarFooter $isCollapsed={isCollapsed}>
                    <FooterMenuLink to="/settings" $isCollapsed={isCollapsed} onClick={closeMobileMenu}>
                        <MenuItemIcon $isActive={false}>
                            <Settings />
                        </MenuItemIcon>
                        <MenuItemText $isCollapsed={isCollapsed}>Ustawienia</MenuItemText>
                    </FooterMenuLink>
                    <FooterMenuButton $isCollapsed={isCollapsed} $danger onClick={handleLogout}>
                        <MenuItemIcon $isActive={false} style={{ color: 'inherit' }}>
                            <LogOut />
                        </MenuItemIcon>
                        <MenuItemText $isCollapsed={isCollapsed}>Wyloguj</MenuItemText>
                    </FooterMenuButton>
                    <VersionRow $isCollapsed={isCollapsed}>
                        <StatusDot />
                        <VersionText $isCollapsed={isCollapsed}>v1.0.0 · Online</VersionText>
                    </VersionRow>
                </SidebarFooter>

                {isCollapsed && (
                    <ExpandButton onClick={toggleCollapse} title="Rozwiń menu">
                        <PanelLeftOpen />
                    </ExpandButton>
                )}
            </SidebarContainer>
        </>
    );
};
