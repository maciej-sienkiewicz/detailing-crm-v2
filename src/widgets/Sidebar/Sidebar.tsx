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
    Inbox,
    Smartphone,
    Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from './context/SidebarContext';
import { useAuth } from '@/core/context/AuthContext';
import { usePermissions, ANY_FINANCE, ANY_SETTINGS } from '@/core/permissions';
import type { PermissionRequirement } from '@/core/permissions';
import { authApi } from '@/modules/auth/api/authApi';
import { useSmsCreditBalance } from '@/modules/settings/hooks/useSmsCredits';
import { useNewLeadsCount } from '@/modules/leads/hooks/useLeads';
import { useLeadSocket } from '@/modules/leads/hooks/useLeadSocket';
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

// Each menu entry may declare a permission requirement (single code or ANY-OF
// list). Entries the user cannot access are removed entirely — inaccessible
// modules simply do not exist in the UI. Sections left empty are dropped.
type GuardedMenuItem = MenuItem & { requires?: PermissionRequirement };
type GuardedMenuSection = { title?: string; items: GuardedMenuItem[] };

const buildMenuSections = (
    newLeadsCount: number,
    can: (required: PermissionRequirement) => boolean,
): MenuSection[] => {
    const sections: GuardedMenuSection[] = [
        {
            title: 'Główne',
            items: [
                { path: '/dashboard',  label: 'Tablica',   icon: LayoutDashboard },
                { path: '/operations', label: 'Wizyty',    icon: CalendarCheck, requires: 'VISITS_VIEW' },
                { path: '/calendar',   label: 'Kalendarz', icon: Calendar,      requires: 'VISITS_VIEW' },
                { path: '/batch-orders', label: 'Zlecenia zbiorcze', icon: Layers },
                { path: '/leads', label: 'Leady', icon: Inbox, badge: newLeadsCount > 0 ? newLeadsCount : undefined, alert: newLeadsCount > 0, requires: 'LEADS_MANAGE' },
            ],
        },
        {
            title: 'Baza klientów',
            items: [
                { path: '/customers', label: 'Klienci',   icon: Users, requires: 'CUSTOMERS_VIEW' },
                { path: '/vehicles',  label: 'Samochody', icon: Car,   requires: 'CUSTOMERS_VIEW' },
            ],
        },
        {
            title: 'Administracja',
            items: [
                { path: '/finances',   label: 'Finanse',    icon: FileText,   requires: ANY_FINANCE },
                { path: '/statistics', label: 'Statystyki', icon: TrendingUp, requires: 'STATISTICS_VIEW' },
                { path: '/gallery',    label: 'Galeria',    icon: Images,     requires: 'VISITS_VIEW' },
                { path: '/settings',   label: 'Ustawienia', icon: Settings, requires: ANY_SETTINGS },
            ],
        },
        {
            title: 'Marketing',
            items: [
                { path: '/sms-campaigns',  label: 'Kampanie SMS',   icon: MessageSquare, requires: 'COMMUNICATION_SEND' },
                { path: '/instagram',      label: 'Instagram',      icon: Camera, requires: 'MARKETING_MANAGE' },
                { path: '/google-reviews', label: 'Google Reviews', icon: Search, requires: 'MARKETING_MANAGE' },
            ],
        },
        {
            title: 'Mobilne',
            items: [
                { path: '/mobile-shortcuts', label: 'Skróty mobilne', icon: Smartphone, requires: 'VISITS_VIEW' },
            ],
        },
    ];

    return sections
        .map(({ title, items }) => ({
            title,
            items: items
                .filter(({ requires }) => !requires || can(requires))
                .map(({ requires: _requires, ...item }) => item),
        }))
        .filter(section => section.items.length > 0);
};

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

    const { can } = usePermissions();
    const newLeadsCount = useNewLeadsCount({ enabled: can('LEADS_MANAGE') });

    // Persistent WebSocket connection for the entire CRM session
    useLeadSocket();
    const menuSections = buildMenuSections(newLeadsCount, can);

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
                    <SmsCreditsWidget
                        $isCollapsed={isCollapsed}
                        onClick={() => { navigate('/settings?tab=credits'); closeMobileMenu(); }}
                        title="Przejdź do ustawień kredytów SMS"
                    >
                        <SmsCreditsIcon>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </SmsCreditsIcon>
                        <SmsCreditsInfo $isCollapsed={isCollapsed}>
                            <SmsCreditsLabel>Kredyty SMS</SmsCreditsLabel>
                            <SmsCreditsValue $isEmpty={creditBalance.availableCredits === 0}>
                                {creditBalance.availableCredits === 0
                                    ? 'Brak kredytów'
                                    : creditBalance.availableCredits.toLocaleString('pl-PL')}
                            </SmsCreditsValue>
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

            </SidebarContainer>

            {isCollapsed && (
                <ExpandButton onClick={toggleCollapse} title="Rozwiń menu">
                    <PanelLeftOpen />
                </ExpandButton>
            )}
        </>
    );
};
