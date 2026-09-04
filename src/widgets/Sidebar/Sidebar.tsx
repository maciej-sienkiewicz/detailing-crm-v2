import { useEffect, useMemo, useState } from 'react';
import {
    Bell,
    LayoutDashboard,
    Calendar,
    CalendarCheck,
    Users,
    Car,
    TrendingUp,
    MessageSquare,
    FileText,
    PanelLeftClose,
    PanelLeftOpen,
    X,
    Camera,
    Settings,
    LogOut,
    Inbox,
    Mail,
    Layers,
    Clock,
    UserRoundCog,
    Images,
    Activity,
    CircleAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from './context/SidebarContext';
import { useAuth } from '@/core/context/AuthContext';
import { usePermissions, ANY_FINANCE, ANY_DASHBOARD } from '@/core/permissions';
import type { PermissionRequirement } from '@/core/permissions';
import { authApi } from '@/modules/auth/api/authApi';
import { useNewLeadsCount, useUnreadMailCount, useCommsSocket } from '@/modules/comms';
import { useMyTasksUnreadCount } from '@/modules/notifications';
import { SidebarMenu, MenuSection } from './SidebarMenu';
import type { MenuItem } from './SidebarMenuItem';
import { UserSwitcherPanel, useKnownProfiles } from '@/modules/pin-switcher';
import { ReportProblemModal } from '@/modules/support/components/ReportProblemModal';
import { useCompanySettings } from '@/modules/settings/hooks/useCompany';
import { companyInitials } from './companyBadge';
import { readCompanyHeader, writeCompanyHeader } from './companyHeaderCache';
import {
    Overlay,
    SidebarContainer,
    SidebarHeader,
    Logo,
    LogoIcon,
    LogoImage,
    LogoText,
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

// Each menu entry may declare a permission requirement (single code or ANY-OF
// list). Entries the user cannot access are removed entirely: inaccessible
// modules simply do not exist in the UI. Sections left empty are dropped.
type GuardedMenuItem = MenuItem & { requires?: PermissionRequirement; showWhen?: boolean };
type GuardedMenuSection = { title?: string; pinned?: boolean; items: GuardedMenuItem[] };

const buildMenuSections = (
    newLeadsCount: number,
    unreadMailCount: number,
    unreadNotifications: number,
    can: (required: PermissionRequirement) => boolean,
    trackWorkTime: boolean,
    onReportProblem: () => void,
): MenuSection[] => {
    const canSeeDashboard = can(ANY_DASHBOARD);
    const sections: GuardedMenuSection[] = [
        {
            title: 'Główne',
            items: [
                { path: '/dashboard',     label: 'Tablica',           icon: LayoutDashboard, requires: ANY_DASHBOARD },
                // Task inbox replacing the dashboard's "Do zrobienia" for roles without Tablica.
                { path: '/notifications', label: 'Powiadomienia',     icon: Bell, badge: unreadNotifications > 0 ? unreadNotifications : undefined, alert: unreadNotifications > 0, showWhen: !canSeeDashboard },
                { path: '/worktime',      label: 'Czas pracy',        icon: Clock,          showWhen: trackWorkTime },
                { path: '/operations',    label: 'Wizyty',            icon: CalendarCheck, requires: 'VISITS_VIEW' },
                { path: '/calendar',      label: 'Kalendarz',         icon: Calendar,      requires: 'VISITS_VIEW' },
                { path: '/batch-orders',  label: 'Zlecenia zbiorcze', icon: Layers, requires: 'BATCH_ORDERS' },
                { path: '/gallery',       label: 'Galeria',           icon: Images, requires: 'VISITS_VIEW' },
                { path: '/communication', label: 'Poczta', icon: Mail, badge: unreadMailCount > 0 ? unreadMailCount : undefined, alert: unreadMailCount > 0, requires: 'LEADS_MANAGE' },
                // Bez czerwonego alertu: leada tworzy świadome kliknięcie użytkownika,
                // więc nie ma czego zgłaszać jako nowość. Licznik zostaje - mówi, ile
                // zapytań czeka na ruch - ale nie krzyczy jak nieprzeczytana poczta.
                { path: '/leads', label: 'Leady', icon: Inbox, badge: newLeadsCount > 0 ? newLeadsCount : undefined, requires: 'LEADS_MANAGE' },
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
            // Przyklejona do dołu menu: Ustawienia i zgłoszenie problemu mają być
            // widoczne bez przewijania, niezależnie od liczby modułów wyżej.
            pinned: true,
            items: [
                // Parowanie telefonu do Click-to-Call przeniosło się stąd do
                // Ustawień → Urządzenia mobilne, obok tabletów do podpisu:
                // jedno miejsce na wszystkie urządzenia zamiast pozycji w menu,
                // którą klikało się raz w życiu.
                { path: '/settings',   label: 'Ustawienia', icon: Settings },
                { label: 'Zgłoś problem', icon: CircleAlert, onClick: onReportProblem },
            ],
        },
    ];

    return sections
        .map(({ title, pinned, items }) => ({
            title,
            pinned,
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
    const menuSections = buildMenuSections(newLeadsCount, unreadMailCount, unreadNotifications, can, user?.trackWorkTime ?? false, () => setShowReportProblem(true));

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
     * Nagłówek rysuje się od pierwszej klatki z zapisu lokalnego, a `GET /v1/company`
     * tylko go potwierdza. Wcześniej przy każdym odświeżeniu strony przez moment
     * widać było inicjały, zanim doszło logo - dane nagłówka zmieniają się raz na
     * ruski rok, więc czekanie na sieć nic nie wnosiło poza tym przeskokiem.
     *
     * Odpowiedź serwera ma pierwszeństwo: gdy studio usunęło logo, `company.logoUrl`
     * jest nullem i zapis lokalny NIE może go wskrzesić - stąd rozróżnienie „mamy już
     * odpowiedź" od „jeszcze jej nie ma", a nie zwykłe `??`.
     */
    const cachedHeader = useMemo(() => readCompanyHeader(user?.studioId), [user?.studioId]);

    useEffect(() => {
        if (company) {
            writeCompanyHeader(user?.studioId, { name: company.name ?? null, logoUrl: company.logoUrl ?? null });
        }
    }, [company, user?.studioId]);

    // Dopóki nie ma ani odpowiedzi, ani zapisu lokalnego, w nagłówku zostaje nazwa
    // produktu - pusty pasek albo szkielet migałby przy każdym wejściu do aplikacji.
    const companyName = (company?.name ?? cachedHeader?.name)?.trim() || 'AutoCRM';

    /**
     * Studio, które wgrało logo, widzi je w nagłówku zamiast inicjałów - to jego
     * znak firmowy, a litery były tylko namiastką na czas, gdy loga nie ma.
     *
     * Adres logo to podpisany link do S3, więc potrafi wygasnąć albo nie odpowiedzieć.
     * Ikona zepsutego obrazka w nagłówku wygląda jak awaria aplikacji, dlatego przy
     * błędzie wczytania wracamy do inicjałów. Zapamiętujemy ADRES, który zawiódł, a nie
     * samą flagę - świeży link (po wgraniu nowego logo albo po odświeżeniu podpisu)
     * jest wtedy próbowany od nowa, bez efektu czyszczącego stan.
     */
    const logoUrl = (company ? company.logoUrl : cachedHeader?.logoUrl)?.trim() || null;
    const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
    const showLogo = !!logoUrl && failedLogoUrl !== logoUrl;

    const displayName = user
        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
        : '';

    return (
        <>
            <Overlay $isVisible={isMobileOpen} onClick={closeMobileMenu} />

            <SidebarContainer $isCollapsed={isCollapsed} $isMobileOpen={isMobileOpen}>
                <SidebarHeader $isCollapsed={isCollapsed}>
                    <Logo $isCollapsed={isCollapsed}>
                        {showLogo
                            ? (
                                <LogoImage
                                    key={logoUrl}
                                    src={logoUrl!}
                                    alt={companyName}
                                    onError={() => setFailedLogoUrl(logoUrl)}
                                />
                            )
                            : <LogoIcon>{companyInitials(company?.name)}</LogoIcon>}
                        <LogoText $isCollapsed={isCollapsed} title={companyName}>
                            {companyName}
                        </LogoText>
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

            {showReportProblem && (
                <ReportProblemModal onClose={() => setShowReportProblem(false)} />
            )}
        </>
    );
};
