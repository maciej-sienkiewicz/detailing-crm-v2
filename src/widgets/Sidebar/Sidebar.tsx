import { useEffect } from 'react';
import {
    LayoutDashboard,
    Calendar,
    CalendarCheck,
    Target,
    Users,
    Car,
    BarChart3,
    TrendingUp,
    Zap,
    Activity,
    MessageSquare,
    Wrench,
    FileText,
    ClipboardCheck,
    UserCog,
    PanelLeftClose,
    PanelLeftOpen,
    X,
    Menu,
} from 'lucide-react';
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
    VersionRow,
    StatusDot,
    VersionText,
    ExpandButton,
    MobileMenuButton,
} from './SidebarStyles';

const menuSections: MenuSection[] = [
    {
        title: 'Operacje',
        items: [
            { path: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
            { path: '/calendar',   label: 'Kalendarz',  icon: Calendar },
            { path: '/operations', label: 'Wizyty',     icon: CalendarCheck, badge: '3' },
            { path: '/leads',      label: 'Leady',      icon: Target },
        ],
    },
    {
        title: 'Klienci & Pojazdy',
        items: [
            { path: '/customers', label: 'Klienci',  icon: Users },
            { path: '/vehicles',  label: 'Pojazdy',  icon: Car },
        ],
    },
    {
        title: 'Finanse & Analityka',
        items: [
            { path: '/finance',                label: 'Finanse',          icon: BarChart3 },
            { path: '/statistics',             label: 'Statystyki',       icon: TrendingUp },
            { path: '/growth-engine',          label: 'Growth Engine',    icon: Zap },
            { path: '/competition-monitoring', label: 'Monitoring',       icon: Activity },
        ],
    },
    {
        title: 'Marketing',
        items: [
            { path: '/sms-campaigns', label: 'Kampanie SMS', icon: MessageSquare },
        ],
    },
    {
        title: 'Konfiguracja',
        items: [
            { path: '/services',  label: 'Usługi',     icon: Wrench },
            { path: '/consents',  label: 'Zgody',      icon: FileText },
            { path: '/protocols', label: 'Protokoły',  icon: ClipboardCheck },
            { path: '/team',      label: 'Zespół',     icon: UserCog },
        ],
    },
];

export const Sidebar = () => {
    const { isCollapsed, isMobileOpen, toggleCollapse, toggleMobileMenu, closeMobileMenu } = useSidebar();

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isMobileOpen) closeMobileMenu();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isMobileOpen, closeMobileMenu]);

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
