import { useEffect, useMemo, useState } from 'react';
import {
    PanelLeftClose,
    PanelLeftOpen,
    X,
    LogOut,
    UserRoundCog,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from './context/SidebarContext';
import { useAuth } from '@/core/context/AuthContext';
import { usePermissions, ANY_DASHBOARD } from '@/core/permissions';
import { authApi } from '@/modules/auth/api/authApi';
import { useNewLeadsCount, useUnreadMailCount, useCommsSocket } from '@/modules/comms';
import { useBadgesSocket } from '@/modules/badges';
import { useScheduleSocket } from '@/modules/dashboard/hooks/useScheduleSocket';
import { useMyTasksUnreadCount } from '@/modules/notifications';
import { SidebarMenu } from './SidebarMenu';
import { buildMenuSections } from './menuSections';
import { UserSwitcherPanel, useKnownProfiles } from '@/modules/pin-switcher';
import { ReportProblemModal } from '@/modules/support/components/ReportProblemModal';
import { useCompanySettings } from '@/modules/settings/hooks/useCompany';
import { usePendingLeaveRequestsCount } from '@/modules/employees/hooks/useLeaveRequests';
import { usePendingCardsCount } from '@/modules/employees/hooks/useWorktimeMonths';
import { usePendingSheetsCount } from '@/modules/employees/hooks/useAttendanceSheets';
import { companyDisplayName } from './companyBadge';
import { readCompanyHeader, writeCompanyHeader } from './companyHeaderCache';
import { SidebarBrand } from './SidebarBrand';
import {
    Overlay,
    SidebarContainer,
    SidebarHeader,
    HeaderActions,
    CollapseButton,
    CloseButton,
    ExpandButton,
    UserProfile,
    UserAvatar,
    UserInfo,
    UserName,
    UserRole,
    UserLogoutButton,
    UserSwitchButton,
    UserActions,
} from './SidebarStyles';
import { getRoleLabel } from './roleLabel';

const getInitials = (firstName?: string, lastName?: string): string => {
    const f = firstName?.[0] ?? '';
    const l = lastName?.[0] ?? '';
    return (f + l).toUpperCase() || 'AU';
};

export const Sidebar = () => {
    const { isCollapsed, isMobileOpen, toggleCollapse, closeMobileMenu } = useSidebar();
    const { user, setAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { getProfiles, addOrUpdateProfile } = useKnownProfiles();

    const [showSwitcher, setShowSwitcher] = useState(false);
    const [showReportProblem, setShowReportProblem] = useState(false);

    const { can } = usePermissions();
    const { company } = useCompanySettings();
    const newLeadsCount = useNewLeadsCount({ enabled: can('LEADS_MANAGE') });
    const unreadMailCount = useUnreadMailCount({ enabled: can('LEADS_MANAGE') });
    // Badge for the task inbox, only fetched by users who actually see the tab.
    const unreadNotifications = useMyTasksUnreadCount({ enabled: !can(ANY_DASHBOARD) });

    // Persistent WebSocket connection for the entire CRM session
    useCommsSocket();
    // Plakietki menu i widoki wizyt/rezerwacji odświeżane pushem, a nie pollingiem.
    useBadgesSocket();
    useScheduleSocket();
    // Licznik wniosków tylko dla tych, którzy je rozpatrują (właściciel zawsze).
    const pendingLeaveRequests = usePendingLeaveRequestsCount(can('EMPLOYEES_LEAVES_APPROVE'));
    // Karty czasu pracy do decyzji i niezatwierdzone listy obecności - tylko dla kadr
    // (EMPLOYEES_MANAGE). Te same liczby stoją przy zakładkach „Czas pracy" i „Listy obecności".
    // Wszystkie plakietki to jedno zapytanie GET /v1/me/badges (modules/badges).
    const canManageEmployees = can('EMPLOYEES_MANAGE');
    const pendingWorkTime = usePendingCardsCount(canManageEmployees) + usePendingSheetsCount(canManageEmployees);
    const menuSections = buildMenuSections({
        newLeadsCount,
        unreadMailCount,
        unreadNotifications,
        pendingLeaveRequests,
        pendingWorkTime,
        can,
        trackWorkTime: user?.trackWorkTime ?? false,
        hasEmployeeRecord: Boolean(user?.employeeId),
        onReportProblem: () => setShowReportProblem(true),
    });

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

    /**
     * Nazwa studia pod logo rysuje się od pierwszej klatki z zapisu lokalnego,
     * a `GET /v1/company` tylko ją potwierdza - bez tego przy każdym odświeżeniu
     * strony podpis dochodziłby z opóźnieniem i nagłówek skakał o linię.
     */
    const cachedHeader = useMemo(() => readCompanyHeader(user?.studioId), [user?.studioId]);

    useEffect(() => {
        if (company) {
            writeCompanyHeader(user?.studioId, { name: company.name ?? null });
        }
    }, [company, user?.studioId]);

    // Dopóki nie ma ani odpowiedzi, ani zapisu lokalnego, pod logo nie ma podpisu.
    const companyName = (company?.name ?? cachedHeader?.name)?.trim() || null;

    const displayName = user
        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
        : '';

    return (
        <>
            <Overlay $isVisible={isMobileOpen} onClick={closeMobileMenu} />

            {/* Wysunięte menu na telefonie to okno modalne: tylko z tym oznaczeniem systemowy
                „Wstecz" w aplikacji (installNativeShell) najpierw je zamknie, zamiast cofnąć stronę.
                Na komputerze menu jest stałe, więc bez roli. */}
            <SidebarContainer
                $isCollapsed={isCollapsed}
                $isMobileOpen={isMobileOpen}
                {...(isMobileOpen ? { role: 'dialog', 'aria-modal': true, 'aria-label': 'Menu' } : {})}
            >
                <SidebarHeader $isCollapsed={isCollapsed}>
                    <SidebarBrand
                        isCollapsed={isCollapsed}
                        companyName={companyName && companyDisplayName(companyName)}
                        legalName={companyName}
                        actions={
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
                        }
                    />
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
                        {/* Rola nadana przez studio („Recepcja"), a bez niej rodzaj konta. */}
                        <UserRole>{user ? user.roleName || getRoleLabel(user.role) : ''}</UserRole>
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

            {showReportProblem && (
                <ReportProblemModal onClose={() => setShowReportProblem(false)} />
            )}
        </>
    );
};
