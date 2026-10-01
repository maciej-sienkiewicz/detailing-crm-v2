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
import { useMyTasksUnreadCount } from '@/modules/notifications';
import { SidebarMenu } from './SidebarMenu';
import { buildMenuSections } from './menuSections';
import { UserSwitcherPanel, useKnownProfiles } from '@/modules/pin-switcher';
import { ReportProblemModal } from '@/modules/support/components/ReportProblemModal';
import { useCompanySettings } from '@/modules/settings/hooks/useCompany';
import { usePendingLeaveRequestsCount } from '@/modules/employees/hooks/useLeaveRequests';
import { companyDisplayName, companyInitials } from './companyBadge';
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
    // Licznik wniosków tylko dla tych, którzy je rozpatrują (właściciel zawsze).
    const pendingLeaveRequests = usePendingLeaveRequestsCount(can('EMPLOYEES_LEAVES_APPROVE'));
    const menuSections = buildMenuSections({
        newLeadsCount,
        unreadMailCount,
        unreadNotifications,
        pendingLeaveRequests,
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
            writeCompanyHeader(user?.studioId, {
                name: company.name ?? null,
                logoUrl: company.logoUrl ?? null,
                logoNeedsLightPlate: company.logoNeedsLightPlate,
                logoAspectRatio: company.logoAspectRatio,
            });
        }
    }, [company, user?.studioId]);

    // Dopóki nie ma ani odpowiedzi, ani zapisu lokalnego, w nagłówku zostaje nazwa
    // produktu - pusty pasek albo szkielet migałby przy każdym wejściu do aplikacji.
    const companyName = (company?.name ?? cachedHeader?.name)?.trim() || 'AutoCRM';

    /**
     * Studio, które wgrało logo, widzi je w nagłówku zamiast inicjałów - to jego
     * znak firmowy, a litery były tylko namiastką na czas, gdy loga nie ma.
     *
     * Adres logo jest stały (hash treści w ścieżce), więc przeglądarka rysuje je z
     * pamięci podręcznej od pierwszej klatki. Obrazek nie ma `key` po adresie: gdy
     * adres się zmieni (nowe logo), stary obraz zostaje na ekranie do chwili wczytania
     * nowego, zamiast mignięcia pustym miejscem. Gdyby link nie odpowiedział (usunięte
     * logo, wygasły podpis starego linku), ikona zepsutego obrazka wyglądałaby jak
     * awaria, dlatego przy błędzie wracamy do inicjałów. Zapamiętujemy ADRES, który
     * zawiódł, a nie samą flagę: nowy adres jest próbowany od nowa.
     */
    const logoUrl = (company ? company.logoUrl : cachedHeader?.logoUrl)?.trim() || null;
    const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
    const showLogo = !!logoUrl && failedLogoUrl !== logoUrl;

    /**
     * Logo w każdym kształcie stoi na środku nagłówka (SidebarBrand); kształt decyduje
     * już tylko o zwiniętym menu: poziomy logotyp (szerokość ≥ 1,6 × wysokość) nie
     * zmieści się czytelnie w 36-pikselowym kafelku, więc tam ustępuje inicjałom.
     * Podkładka pod logo tylko wtedy, gdy backend uznał, że bez niej logo zniknie na
     * ciemnym pasku (przezroczyste tło + ciemny tusz); logo sprzed tej analizy (brak
     * proporcji) zachowuje dawny wygląd: białą podkładkę.
     */
    const logoSource = company ?? cachedHeader;
    const logoAspectRatio = logoSource?.logoAspectRatio ?? null;
    const logoNeedsPlate = logoSource?.logoNeedsLightPlate ?? true;
    const isWideLogo = logoAspectRatio !== null && logoAspectRatio >= 1.6;

    const displayName = user
        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
        : '';

    return (
        <>
            <Overlay $isVisible={isMobileOpen} onClick={closeMobileMenu} />

            <SidebarContainer $isCollapsed={isCollapsed} $isMobileOpen={isMobileOpen}>
                <SidebarHeader $isCollapsed={isCollapsed}>
                    <SidebarBrand
                        isCollapsed={isCollapsed}
                        companyName={companyDisplayName(companyName)}
                        legalName={companyName}
                        initials={companyInitials(company?.name)}
                        logoUrl={showLogo ? logoUrl : null}
                        logoNeedsPlate={logoNeedsPlate}
                        isWideLogo={isWideLogo}
                        onLogoError={() => setFailedLogoUrl(logoUrl)}
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
