import { useEffect, useState } from 'react';
import {
    Bell,
    LayoutDashboard,
    Calendar,
    CalendarCheck,
    Users,
    Car,
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
    Layers,
    Clock,
    UserRoundCog,
    Images,
    Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from './context/SidebarContext';
import { useAuth } from '@/core/context/AuthContext';
import { usePermissions, ANY_FINANCE } from '@/core/permissions';
import type { PermissionRequirement } from '@/core/permissions';
import { authApi } from '@/modules/auth/api/authApi';
import { useNewLeadsCount } from '@/modules/leads/hooks/useLeads';
import { useMyTasksUnreadCount } from '@/modules/notifications';
import { useLeadSocket } from '@/modules/leads/hooks/useLeadSocket';
import { SidebarMenu, MenuSection } from './SidebarMenu';
import { UserSwitcherPanel, useKnownProfiles } from '@/modules/pin-switcher';
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
    UserSwitchButton,
    UserActions,
} from './SidebarStyles';

// Each menu entry may declare a permission requirement (single code or ANY-OF
// list). Entries the user cannot access are removed entirely — inaccessible
// modules simply do not exist in the UI. Sections left empty are dropped.
type GuardedMenuItem = MenuItem & { requires?: PermissionRequirement; showWhen?: boolean };
type GuardedMenuSection = { title?: string; items: GuardedMenuItem[] };

const buildMenuSections = (
    newLeadsCount: number,
    unreadNotifications: number,
    can: (required: PermissionRequirement) => boolean,
    trackWorkTime: boolean,
): MenuSection[] => {
    const canSeeDashboard = can('VISITS_VIEW');
    const sections: GuardedMenuSection[] = [
        {
            title: 'Główne',
            items: [
                { path: '/dashboard',     label: 'Tablica',           icon: LayoutDashboard, requires: 'VISITS_VIEW' },
                // Task inbox replacing the dashboard's "Do zrobienia" for roles without Tablica.
                { path: '/notifications', label: 'Powiadomienia',     icon: Bell, badge: unreadNotifications > 0 ? unreadNotifications : undefined, alert: unreadNotifications > 0, showWhen: !canSeeDashboard },
                { path: '/worktime',      label: 'Czas pracy',        icon: Clock,          showWhen: trackWorkTime },
                { path: '/operations',    label: 'Wizyty',            icon: CalendarCheck, requires: 'VISITS_VIEW' },
                { path: '/calendar',      label: 'Kalendarz',         icon: Calendar,      requires: 'VISITS_VIEW' },
                { path: '/batch-orders',  label: 'Zlecenia zbiorcze', icon: Layers, requires: 'BATCH_ORDERS' },
                { path: '/gallery',       label: 'Galeria',           icon: Images, requires: 'VISITS_VIEW' },
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
                { path: '/activity',   label: 'Aktywność',  icon: Activity,   requires: 'AUDIT_VIEW' }
            ],
        },
        {
            title: 'Marketing',
            items: [
                { path: '/campaigns',      label: 'Kampanie',       icon: MessageSquare, requires: 'COMMUNICATION_SEND' },
                { path: '/instagram',      label: 'Instagram',      icon: Camera, requires: 'MARKETING_MANAGE' }
            ],
        },
        {
            title: 'Portal',
            items: [
                { path: '/settings',   label: 'Ustawienia', icon: Settings },
            ],
        },
    ];

    return sections
        .map(({ title, items }) => ({
            title,
            items: items
                .filter(({ requires, showWhen }) =>
                    (showWhen ?? true) && (!requires || can(requires)))
                .map(({ requires: _requires, showWhen: _showWhen, ...item }) => item),
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
    const { getProfiles, addOrUpdateProfile } = useKnownProfiles();

    const [showSwitcher, setShowSwitcher] = useState(false);

    const { can } = usePermissions();
    const newLeadsCount = useNewLeadsCount({ enabled: can('LEADS_MANAGE') });
    // Badge for the task inbox — only fetched by users who actually see the tab.
    const unreadNotifications = useMyTasksUnreadCount({ enabled: !can('VISITS_VIEW') });

    // Persistent WebSocket connection for the entire CRM session
    useLeadSocket();
    const menuSections = buildMenuSections(newLeadsCount, unreadNotifications, can, user?.trackWorkTime ?? false);

    // Register the current user in localStorage so the switcher can list them.
    // Runs whenever the logged-in user changes (login / PIN switch).
    const [profileCount, setProfileCount] = useState(() => getProfiles().length);
    useEffect(() => {
        if (user) {
            addOrUpdateProfile({
                userId: user.userId,
                studioId: user.studioId,
                firstName: user.firstName ?? '',
                lastName: user.lastName ?? '',
                role: user.role,
            });
            setProfileCount(getProfiles().length);
        }
    }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

    // Show user switcher button when 2+ profiles are stored locally
    const hasMultipleProfiles = profileCount >= 2;

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
                    <UserActions $isCollapsed={isCollapsed}>
                        {hasMultipleProfiles && (
                            <UserSwitchButton
                                onClick={() => setShowSwitcher(true)}
                                title="Przełącz użytkownika"
                                aria-label="Przełącz użytkownika"
                            >
                                <UserRoundCog size={14} />
                            </UserSwitchButton>
                        )}
                        <UserLogoutButton
                            onClick={handleLogout}
                            title="Wyloguj"
                            aria-label="Wyloguj"
                        >
                            <LogOut />
                        </UserLogoutButton>
                    </UserActions>
                </UserProfile>

            </SidebarContainer>

            {isCollapsed && (
                <ExpandButton onClick={toggleCollapse} title="Rozwiń menu">
                    <PanelLeftOpen />
                </ExpandButton>
            )}

            {showSwitcher && (
                <UserSwitcherPanel onClose={() => setShowSwitcher(false)} />
            )}
        </>
    );
};
