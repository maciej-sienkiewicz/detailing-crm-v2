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
    Camera,
    Settings,
    LogOut,
    Search,
    Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from './context/SidebarContext';
import { useAuth } from '@/core/context/AuthContext';
import { authApi } from '@/modules/auth/api/authApi';
import { useSmsCreditBalance } from '@/modules/settings/hooks/useSmsCredits';
import { SidebarMenu, MenuSection } from './SidebarMenu';
import {
    Overlay,
    SidebarContainer,
    SidebarHeader,
    Logo,
    LogoIcon,
    LogoText,
    LogoSub,
    HeaderActions,
    CollapseButton,
    CloseButton,
    ExpandButton,
    MobileMenuButton,
    UserProfile,
    UserAvatar,
    UserInfo,
    UserName,
    UserRole,
    UserLogoutButton,
    SmsCreditsWidget,
    SmsCreditsIcon,
    SmsCreditsInfo,
    SmsCreditsLabel,
    SmsCreditsValue,
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
            { path: '/finances',   label: 'Finanse',    icon: FileText },
            { path: '/reports',    label: 'Raporty',    icon: BarChart3 },
            { path: '/statistics', label: 'Statystyki', icon: TrendingUp },
            { path: '/team',       label: 'Pracownicy', icon: UserCog },
            { path: '/gallery',    label: 'Galeria',    icon: Images },
            { path: '/settings',   label: 'Ustawienia', icon: Settings },
        ],
    },
    {
        title: 'Marketing',
        items: [
            { path: '/sms-campaigns',          label: 'Kampanie SMS',  icon: MessageSquare },
            { path: '/settings?tab=credits',   label: 'Kredyty SMS',   icon: Wallet },
            { path: '/instagram',              label: 'Instagram',     icon: Camera },
            { path: '/google-reviews',         label: 'Google Reviews', icon: Search },
        ],
    },
];

const getRoleLabel = (role: string): string => {
    const map: Record<string, string> = {
        owner:    'Właściciel',
        admin:    'Administrator',
        employee: 'Pracownik',
        manager:  'Menedżer',
    };
    return map[role.toLowerCase()] ?? role;
};

const getInitials = (firstName?: string, lastName?: string): string => {
    const f = firstName?.[0] ?? '';
    const l = lastName?.[0] ?? '';
    return (f + l).toUpperCase() || 'AU';
};

export const Sidebar = () => {
    const { isCollapsed, isMobileOpen, toggleCollapse, toggleMobileMenu, closeMobileMenu } = useSidebar();
    const { user, setAuthenticated } = useAuth();
    const navigate = useNavigate();

    const isDetailer = user?.role?.toLowerCase() === 'detailer';
    const { data: creditBalance } = useSmsCreditBalance({ enabled: !isDetailer });

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

    const displayName = user
        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
        : '';

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
                        <div>
                            <LogoText $isCollapsed={isCollapsed}>AutoCRM</LogoText>
                            <LogoSub $isCollapsed={isCollapsed}>Studio detailingu</LogoSub>
                        </div>
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

                {!isDetailer && creditBalance !== undefined && (
                    <SmsCreditsWidget $isCollapsed={isCollapsed}>
                        <SmsCreditsIcon>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </SmsCreditsIcon>
                        <SmsCreditsInfo $isCollapsed={isCollapsed}>
                            <SmsCreditsLabel>Kredyty SMS</SmsCreditsLabel>
                            <SmsCreditsValue>{creditBalance.availableCredits.toLocaleString('pl-PL')}</SmsCreditsValue>
                        </SmsCreditsInfo>
                    </SmsCreditsWidget>
                )}

                <SidebarMenu
                    sections={menuSections}
                    isCollapsed={isCollapsed}
                    onNavigate={closeMobileMenu}
                />

                <UserProfile $isCollapsed={isCollapsed}>
                    <UserAvatar>
                        {getInitials(user?.firstName, user?.lastName)}
                    </UserAvatar>
                    <UserInfo $isCollapsed={isCollapsed}>
                        <UserName>{displayName}</UserName>
                        <UserRole>{user ? getRoleLabel(user.role) : ''}</UserRole>
                    </UserInfo>
                    <UserLogoutButton
                        $isCollapsed={isCollapsed}
                        onClick={handleLogout}
                        title="Wyloguj"
                        aria-label="Wyloguj"
                    >
                        <LogOut />
                    </UserLogoutButton>
                </UserProfile>

                {isCollapsed && (
                    <ExpandButton onClick={toggleCollapse} title="Rozwiń menu">
                        <PanelLeftOpen />
                    </ExpandButton>
                )}
            </SidebarContainer>
        </>
    );
};
