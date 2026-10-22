// src/core/router.tsx
import type { ComponentType, ReactNode } from 'react';
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import { RouteErrorBoundary, importWithRetry } from './errors';
import { Layout } from '@/widgets/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BootSplash } from './components/BootSplash';
import { NavigationProgress } from './components/NavigationProgress';
import { ScrollLockRouteReset } from './components/ScrollLockRouteReset';
import { LegacyUrlRedirect } from './components/LegacyUrlRedirect';
import { RedirectWithParams } from './components/RedirectWithParams';
import { RequirePermission, HomeRedirect, NoAccessView, ANY_FINANCE, ANY_DASHBOARD, ANY_EMPLOYEES } from './permissions';
import type { PermissionRequirement } from './permissions';
import { withPersonalDataGate } from './permissions/PersonalDataGate';
import { LegacyLeadsRedirect, LegacyMailRedirect } from '@/modules/comms/views/InboxRedirects';
import { employeesTabRoutes } from '@/modules/employees/employeesRoutes';
import { ModuleGate } from '@/modules/subscription/components/ModuleGate';
import type { FeatureKey } from '@/modules/subscription/types';
import { LEGAL_DOCUMENTS, legalPath } from '@/modules/legal/documents';

// ── Widoki ładowane na żądanie ───────────────────────────────────────────────
//
// KAŻDY widok trasy wchodzi przez `route.lazy`, żaden przez statyczny import.
// Wcześniej router importował wprost prawie cały CRM, więc główny plik JS miał
// 4,8 MB: kalendarz z FullCalendar, wykresy recharts, finanse, statystyki... Telefon
// parsował i wykonywał to wszystko przy KAŻDYM starcie PWA, także po to, żeby
// pokazać sam dashboard - 1,5-2,5 s białego ekranu na średnim Androidzie, zanim
// poszło pierwsze żądanie do serwera.
//
// Dlaczego `route.lazy`, a nie `React.lazy` + Suspense: router zaczyna pobierać kod
// trasy już przy dopasowaniu adresu - przy starcie równolegle z /auth/me, zamiast
// dopiero po przejściu ProtectedRoute i SubscriptionGate. Przy przejściu między
// ekranami poprzedni zostaje na miejscu, dopóki kod następnego nie przyjdzie
// (pasek NavigationProgress), zamiast mignąć pustym ekranem.
//
// Importy wskazują plik widoku, a nie barrel modułu (`@/modules/x`): barrel
// wciąga hooki i komponenty, których widok nie potrzebuje, a gdy coś innego
// importuje go statycznie, Vite zostawia cały moduł w głównym pliku.
//
// `importWithRetry`: brakujący chunk po deployu kończy się jednym przeładowaniem,
// a nieudane przeładowanie - ekranem RouteErrorBoundary (core/errors).

/**
 * Trasa, której element powstaje dopiero po załadowaniu kodu widoku.
 * `render` buduje element wokół widoku (strażnicy, Layout, propsy).
 */
function lazyRoute<P extends object>(
    load: () => Promise<ComponentType<P>>,
    render: (View: ComponentType<P>) => ReactNode,
) {
    return {
        lazy: async () => {
            const View = await importWithRetry(load);
            return { element: render(View) };
        },
    };
}

/** Widok bez strażników i Layoutu: strony publiczne (logowanie, linki z tokenem) i przekierowania. */
const lazyBare = (load: () => Promise<ComponentType>) => lazyRoute(load, View => <View />);

/** Strona aplikacji - jak `page`, z widokiem ładowanym na żądanie. */
const lazyPage = (load: () => Promise<ComponentType>, requires?: PermissionRequirement) =>
    lazyRoute(load, View => page(<View />, requires));

/** Strona modułu płatnego - jak `gatedPage`, z widokiem ładowanym na żądanie. */
const lazyGatedPage = (
    load: () => Promise<ComponentType>,
    featureKey: FeatureKey,
    benefits: string[],
    requires?: PermissionRequirement,
) => lazyRoute(load, View => gatedPage(<View />, featureKey, benefits, requires));

/**
 * Authenticated app page: session guard + optional permission guard + layout.
 * When `requires` is missing the page is available to every logged-in user.
 * Users lacking the permission are silently redirected to their default
 * route (no "access denied" screen), including manual URL entry.
 *
 * Każda strona ma ten sam układ: ProtectedRoute > RequirePermission > Layout, także bez
 * `requires`. Dawniej strony bez wymagań pomijały RequirePermission, więc typ elementu
 * na tej pozycji się zmieniał i przejście np. Kalendarz → Ustawienia montowało Layout
 * i Sidebar od nowa - z ich zapytaniami i ponowną subskrypcją gniazda.
 */
export const page = (view: ReactNode, requires?: PermissionRequirement) => (
    <ProtectedRoute>
        <RequirePermission anyOf={requires}><Layout>{view}</Layout></RequirePermission>
    </ProtectedRoute>
);

/**
 * Module-gated page: like `page`, but the view is wrapped in a ModuleGate.
 * When the studio hasn't purchased the module, the view renders as a blurred,
 * non-interactive demonstration with an unlock overlay (Przelewy24 checkout)
 * instead of being hidden: the user sees exactly what they're missing.
 */
const gatedPage = (
    view: ReactNode,
    featureKey: FeatureKey,
    benefits: string[],
    requires?: PermissionRequirement,
) => page(<ModuleGate featureKey={featureKey} benefits={benefits}>{view}</ModuleGate>, requires);

// ── Copy for the module-gate overlays (what the user loses) ──────────────
const FINANCE_BENEFITS = [
    'Dokumenty finansowe i faktury w jednym miejscu',
    'Kontrola przychodów i kosztów studia',
    'Obsługa kas fiskalnych i integracja z KSeF',
];
const STATISTICS_BENEFITS = [
    'Ile zarabiasz na każdej usłudze',
    'Statystyki kategorii i najpopularniejszych usług',
    'Gdzie i dlaczego prace się opóźniają',
];
const CAMPAIGNS_BENEFITS = [
    'Masowe kampanie SMS i e-mail do bazy klientów',
    'Wiadomości do wybranej grupy klientów',
    'Historia i skuteczność wysyłek',
];
const SMS_EMAIL_BENEFITS = [
    'Przypomnienia o wizytach i potwierdzenia rezerwacji SMS-em',
    'Podgląd wszystkich zaplanowanych SMS-ów w jednym miejscu',
    'Zmiana treści i terminu albo wstrzymanie wysyłki',
];
const INSTAGRAM_BENEFITS = [
    'Śledzenie profili konkurencji na Instagramie',
    'Analiza trendów i najpopularniejszych treści',
    'Inspiracje do własnych publikacji',
];
const PRODUCTS_BENEFITS = [
    'Katalog preparatów z danymi pobieranymi z kodu kreskowego',
    'Notatki i ocena zespołu przy każdym produkcie',
    'Powiązania produktów z wizytami — czym było robione to auto',
];

export const router = createBrowserRouter([
    {
        // Bezpathowy route-rodzic. Istnieje wyłącznie po to, żeby JEDEN
        // `errorElement` obejmował całą aplikację: React Router wypycha błąd
        // do najbliższego rodzica, który go ma. Bez tego każdy route musiałby
        // deklarować własny, a route bez `errorElement` pokazywałby domyślny
        // ekran "Unexpected Application Error!".
        //
        // `<Outlet />` jako element: rodzic nic nie renderuje od siebie,
        // dzieci wyglądają dokładnie tak jak przed zmianą.
        // ScrollLockRouteReset: zwolnienie blokad scrolla po każdej nawigacji
        // (siatka bezpieczeństwa; opis w komponencie).
        // NavigationProgress: pasek u góry, gdy kod następnego ekranu jeszcze się pobiera.
        // LegacyUrlRedirect: stare (polskie) trasy i parametry z pushy, e-maili i OAuth → nowe.
        element: <><ScrollLockRouteReset /><NavigationProgress /><LegacyUrlRedirect><Outlet /></LegacyUrlRedirect></>,
        errorElement: <RouteErrorBoundary />,
        // Pierwsze wejście czeka na kod widoku z `route.lazy` - w tym czasie ekran
        // startowy z index.html, a nie pusta strona.
        hydrateFallbackElement: <BootSplash />,
        children: [
        {
            path: '/login',
            ...lazyBare(() => import('@/modules/auth/views/LoginView').then(m => m.LoginView)),
        },
        {
            path: '/signup',
            ...lazyBare(() => import('@/modules/auth/views/SignupView').then(m => m.SignupView)),
        },
        // Dokumenty prawne - publiczne, pod adresami podanymi w Google, Mecie i Przelewy24
        ...LEGAL_DOCUMENTS.map(doc => ({
            path: legalPath(doc.slug),
            ...lazyRoute(
                () => import('@/modules/legal/views/LegalDocumentView').then(m => m.LegalDocumentView),
                View => <View slug={doc.slug} />,
            ),
        })),
        { path: '/terms', element: <Navigate to={legalPath('regulamin')} replace /> },
        { path: '/privacy', element: <Navigate to={legalPath('polityka-prywatnosci')} replace /> },
        {
            path: '/forgot-password',
            ...lazyBare(() => import('@/modules/auth/views/ForgotPasswordView').then(m => m.ForgotPasswordView)),
        },
        {
            path: '/reset-password',
            ...lazyBare(() => import('@/modules/auth/views/ResetPasswordView').then(m => m.ResetPasswordView)),
        },
        {
            path: '/confirm-password',
            ...lazyRoute(
                () => import('@/modules/auth/views/ResetPasswordView').then(m => m.ResetPasswordView),
                View => <View mode="setup" />,
            ),
        },
        {
            path: '/',
            element: page(<HomeRedirect />),
        },
        {
            // Dashboard requires at least one permission beyond the bare calendar
            // view. Users with only VISITS_VIEW are redirected to /calendar
            // (their getDefaultRoute). Studio owners (null permissions) always pass.
            path: '/dashboard',
            ...lazyPage(() => import('@/modules/dashboard/views/DashboardView').then(m => m.DashboardView), ANY_DASHBOARD),
        },

        // ── Klienci i pojazdy ────────────────────────────────────────────────
        {
            path: '/customers',
            ...lazyPage(() => import('@/modules/customers/views/CustomerListView').then(m => m.CustomerListView), 'CUSTOMERS_VIEW'),
        },
        {
            path: '/customers/:customerId',
            ...lazyPage(() => import('@/modules/customers/views/CustomerDetailView').then(m => m.CustomerDetailView), 'CUSTOMERS_VIEW'),
        },
        {
            path: '/vehicles',
            ...lazyPage(() => import('@/modules/vehicles/views/VehicleListView').then(m => m.VehicleListView), 'CUSTOMERS_VIEW'),
        },
        {
            path: '/vehicles/:vehicleId',
            ...lazyPage(() => import('@/modules/vehicles/views/VehicleDetailView').then(m => m.VehicleDetailView), 'CUSTOMERS_VIEW'),
        },

        // ── Wizyty i kalendarz ───────────────────────────────────────────────
        {
            path: '/calendar',
            ...lazyPage(() => import('@/modules/calendar/views/CalendarPageView').then(m => m.CalendarPageView), 'VISITS_VIEW'),
        },
        {
            // Link z powiadomienia push „Nowa rezerwacja" - tłumaczony na stan kalendarza.
            // Dawny polski adres tego linku przekierowuje LegacyUrlRedirect.
            path: '/calendar/appointments/:appointmentId',
            ...lazyPage(() => import('@/modules/calendar/views/CalendarReservationLink').then(m => m.CalendarReservationLink), 'VISITS_VIEW'),
        },
        {
            path: '/operations',
            ...lazyPage(() => import('@/modules/operations/views/OperationListView').then(m => m.OperationListView), 'VISITS_VIEW'),
        },
        {
            path: '/visits/:visitId',
            ...lazyPage(() => import('@/modules/visits/views/VisitDetailView').then(m => m.VisitDetailView), 'VISITS_VIEW'),
        },
        // Nowa rezerwacja i przyjęcie pojazdu wymagają danych osobowych obok VISITS_CREATE
        // (personalDataActions): bez nich widok się nie montuje, a wejście z adresu dostaje odmowę.
        {
            // Dawny pełnoekranowy kreator rezerwacji (AppointmentCreateView) nie miał już żadnego
            // wejścia w aplikacji. Stary adres otwiera kalendarz z oknem „Nowa rezerwacja",
            // tym samym co skrót „R".
            path: '/appointments/create',
            element: <Navigate to="/calendar" replace state={{ openQuickEvent: true }} />,
        },
        {
            path: '/appointments/:appointmentId/edit',
            ...lazyPage(() => import('@/modules/appointments/views/AppointmentEditView').then(m => m.AppointmentEditView), 'VISITS_CREATE'),
        },
        {
            path: '/checkin/new',
            ...lazyPage(() => import('@/modules/checkin/views/WalkInCheckInWrapper').then(m => withPersonalDataGate(m.WalkInCheckInWrapper, 'canCreateVisit')), 'VISITS_CREATE'),
        },
        {
            path: '/reservations/:reservationId/checkin',
            ...lazyPage(() => import('@/modules/checkin/views/CheckInWizardWrapper').then(m => withPersonalDataGate(m.CheckInWizardWrapper, 'canCreateVisit')), 'VISITS_CREATE'),
        },
        {
            // Kolory przeniosły się do Ustawień → Oznaczenia. Adres zostaje, bo
            // krąży w zakładkach i linkach - prowadzi teraz tam, gdzie widok jest.
            path: '/appointment-colors',
            element: <Navigate to="/settings?tab=labels&view=colors" replace />,
        },
        {
            path: '/gallery',
            ...lazyPage(() => import('@/modules/gallery/views/GalleryView').then(m => m.GalleryView), 'VISITS_VIEW'),
        },
        {
            path: '/protocols',
            ...lazyPage(() => import('@/modules/protocols/views/ProtocolRulesView').then(m => m.ProtocolRulesView), 'VISITS_CREATE'),
        },

        // ── Mobile (public, token-based) ─────────────────────────────────────
        {
            // Public mobile upload route, no auth required, token via ?t=
            path: '/m/upload',
            ...lazyBare(() => import('@/modules/checkin/views/MobilePhotoUploadWrapper').then(m => m.MobilePhotoUploadWrapper)),
        },
        {
            // Publiczny odbiór kontaktów z telefonu, bez logowania; sekret sesji w ?s=
            path: '/m/contacts',
            ...lazyBare(() => import('@/modules/customers/views/MobileContactsImportView').then(m => m.MobileContactsImportView)),
        },
        {
            // Publiczne skanowanie produktu telefonem, bez logowania; token sesji w ?s=
            path: '/m/scan',
            ...lazyBare(() => import('@/modules/products/views/MobileProductScanView').then(m => m.MobileProductScanView)),
        },
        {
            // Public voice intake route, no auth required, token in the fragment #token= (old links: ?token=)
            path: '/m/voice',
            ...lazyBare(() => import('@/modules/voice-commands/views/MobileVoiceCommandsWrapper').then(m => m.MobileVoiceCommandsWrapper)),
        },
        {
            // Public customer Visit Card, no auth required, card token in the path
            path: '/vc/:token',
            ...lazyBare(() => import('@/modules/visit-card/views/VisitCardView').then(m => m.VisitCardView)),
        },
        {
            // Public remote document signing (SMS link), no auth, link token in the path
            path: '/sign/:token',
            ...lazyBare(() => import('@/modules/public-signing/views/PublicSigningView').then(m => m.default)),
        },
        {
            // Personal signature drawing on the user's own phone, no auth, link token in the path
            path: '/m/sig/:token',
            ...lazyBare(() => import('@/modules/profile/views/PhoneSignatureView').then(m => m.PhoneSignatureView)),
        },
        {
            path: '/mobile-shortcuts',
            ...lazyPage(() => import('@/modules/voice-commands/views/MobileShortcutsView').then(m => m.MobileShortcutsView), 'VISITS_VIEW'),
        },
        {
            // Click-to-Call pairing, opened ON THE PHONE (QR in Skróty mobilne).
            // No permission requirement: every logged-in user may pair their own
            // phone - the backend scopes devices and call pushes to the session user.
            path: '/call-device',
            ...lazyPage(() => import('@/modules/push/views/CallDeviceView').then(m => m.CallDeviceView)),
        },

        // ── Zapytania: sprawy (dawne Leady) i poczta w jednej skrzynce ─────────
        {
            // Dawny polski adres skrzynki przekierowuje LegacyUrlRedirect.
            path: '/inbox',
            ...lazyPage(() => import('@/modules/comms/views/InboxView').then(m => m.default), 'LEADS_MANAGE'),
        },
        {
            path: '/leads',
            element: page(<LegacyLeadsRedirect />, 'LEADS_MANAGE'),
        },
        {
            path: '/leads/analytics',
            ...lazyPage(() => import('@/modules/comms/views/LeadAnalyticsView').then(m => m.default), 'LEADS_MANAGE'),
        },

        // ── Komunikacja: dawny adres poczty i ustawienia skrzynek ─────────────
        {
            path: '/communication',
            element: page(<LegacyMailRedirect />, 'LEADS_MANAGE'),
        },
        {
            path: '/communication/mailboxes',
            ...lazyPage(() => import('@/modules/comms/views/MailboxConnectView').then(m => m.default), 'LEADS_MANAGE'),
        },

        // ── Finanse ──────────────────────────────────────────────────────────
        {
            // Jedna trasa; /finance przekierowuje LegacyUrlRedirect.
            path: '/finances',
            ...lazyGatedPage(() => import('@/modules/finance/views/FinanceView').then(m => m.FinanceView), 'FINANCE', FINANCE_BENEFITS, ANY_FINANCE),
        },

        // ── Statystyki i raporty ─────────────────────────────────────────────
        {
            path: '/statistics',
            ...lazyGatedPage(() => import('@/modules/statistics/views/StatisticsView').then(m => m.StatisticsView), 'STATISTICS', STATISTICS_BENEFITS, 'STATISTICS_VIEW'),
        },
        {
            path: '/statistics/costs',
            ...lazyGatedPage(() => import('@/modules/statistics/views/CostsView').then(m => m.CostsView), 'STATISTICS', STATISTICS_BENEFITS, 'STATISTICS_VIEW'),
        },
        {
            path: '/statistics/reports',
            ...lazyGatedPage(() => import('@/modules/statistics/views/ReportsView').then(m => m.ReportsView), 'STATISTICS', STATISTICS_BENEFITS, 'STATISTICS_VIEW'),
        },
        {
            path: '/statistics/categories/:categoryId',
            ...lazyGatedPage(() => import('@/modules/statistics/views/CategoryDetailView').then(m => m.CategoryDetailView), 'STATISTICS', STATISTICS_BENEFITS, 'STATISTICS_VIEW'),
        },

        // ── Komunikacja i marketing ──────────────────────────────────────────
        {
            path: '/campaigns',
            ...lazyGatedPage(() => import('@/modules/campaigns/views/CampaignsListView').then(m => m.CampaignsListView), 'CAMPAIGNS', CAMPAIGNS_BENEFITS, 'COMMUNICATION_SEND'),
        },
        {
            path: '/campaigns/new',
            ...lazyGatedPage(() => import('@/modules/campaigns/views/CampaignWizardView').then(m => m.CampaignWizardView), 'CAMPAIGNS', CAMPAIGNS_BENEFITS, 'COMMUNICATION_SEND'),
        },
        {
            path: '/campaigns/settings',
            ...lazyGatedPage(() => import('@/modules/campaigns/views/CampaignSettingsView').then(m => m.CampaignSettingsView), 'CAMPAIGNS', CAMPAIGNS_BENEFITS, 'COMMUNICATION_SEND'),
        },
        {
            path: '/campaigns/:id',
            ...lazyGatedPage(() => import('@/modules/campaigns/views/CampaignDetailsView').then(m => m.CampaignDetailsView), 'CAMPAIGNS', CAMPAIGNS_BENEFITS, 'COMMUNICATION_SEND'),
        },
        {
            path: '/campaigns/:id/edit',
            ...lazyGatedPage(() => import('@/modules/campaigns/views/CampaignWizardView').then(m => m.CampaignWizardView), 'CAMPAIGNS', CAMPAIGNS_BENEFITS, 'COMMUNICATION_SEND'),
        },
        {
            path: '/scheduled-communication',
            ...lazyGatedPage(() => import('@/modules/scheduled-communication/views/ScheduledCommunicationView').then(m => m.ScheduledCommunicationView), 'SMS_EMAIL', SMS_EMAIL_BENEFITS, 'COMMUNICATION_SEND'),
        },
        // Dawny widok „Zaplanowane SMS-y" to zakładka SMS-ów widoku wyżej.
        {
            path: '/scheduled-sms',
            element: <Navigate to="/scheduled-communication" replace />,
        },
        {
            path: '/instagram',
            ...lazyGatedPage(() => import('@/modules/competition-monitoring/views/CompetitionMonitoringView').then(m => m.CompetitionMonitoringView), 'INSTAGRAM_MONITORING', INSTAGRAM_BENEFITS, 'MARKETING_MANAGE'),
        },

        // ── Urlop (samoobsługa pracownika, bez uprawnienia) ──────────────────
        // Pracownik jest ustalany z sesji, nie z adresu - konto bez rekordu pracownika
        // dostaje ekran „nie jest powiązane", a nie cudze dane.
        {
            path: '/me/leave',
            ...lazyPage(() => import('@/modules/employees/views/MyLeaveView').then(m => m.MyLeaveView)),
        },

        // ── Czas pracy (self-service dla pracowników z trackWorkTime) ────────
        {
            path: '/worktime',
            ...lazyPage(() => import('@/modules/worktime/views/WorkTimeView').then(m => m.WorkTimeView)),
        },

        // ── Historia aktywności ──────────────────────────────────────────────
        {
            path: '/activity',
            ...lazyPage(() => import('@/modules/activity/views/ActivityView').then(m => m.ActivityView), 'AUDIT_VIEW'),
        },

        // ── Pracownicy ───────────────────────────────────────────────────────
        // Moduł wyszedł z Ustawień (`/settings?tab=team` przekierowuje tutaj).
        // JEDNA trasa-rama z zakładkami jako dziećmi (employeesRoutes.tsx): każda zakładka
        // jako osobne `page(...)` montowała przy przełączeniu cały Layout i nagłówek mrugał.
        // Dzieci pilnują własnych uprawnień, rama - tylko dostępu do modułu.
        {
            path: '/employees',
            ...lazyPage(() => import('@/modules/employees/views/EmployeesView').then(m => m.EmployeesView), ANY_EMPLOYEES),
            children: employeesTabRoutes,
        },
        {
            // Dawny adres strony pracownika - pracownik jest oknem nad „Zespołem" (`?person=…`).
            path: '/employees/:employeeId',
            ...lazyBare(() => import('@/modules/employees/views/EmployeesTabViews').then(m => m.LegacyEmployeeRedirect)),
        },
        {
            // Dawny adres strony karty czasu pracy - karta jest znowu oknem nad zakładką
            // „Czas pracy" (`?period=…&card=…`).
            path: '/employees/worktime/:period/:userId',
            ...lazyBare(() => import('@/modules/employees/views/EmployeesTabViews').then(m => m.LegacyWorkTimeCardRedirect)),
        },
        {
            // Dawny adres karty pracownika - krąży w zakładkach przeglądarki.
            path: '/team/:employeeId',
            element: <RedirectWithParams to="/employees/:employeeId" />,
        },

        // ── Ustawienia (dodatkowo zakładki filtrowane wewnątrz widoku) ───────
        {
            path: '/settings',
            ...lazyPage(() => import('@/modules/settings/views/SettingsView').then(m => m.SettingsView)),
        },

        // ── Powrót z płatności Przelewy24 ────────────────────────────────────
        // Bez SubscriptionGate: strona musi działać także dla wygasłych kont,
        // które właśnie opłaciły przedłużenie.
        {
            path: '/payments/result',
            ...lazyRoute(
                () => import('@/modules/subscription/pages/PaymentResultPage').then(m => m.PaymentResultPage),
                View => <ProtectedRoute withSubscriptionGate={false}><View /></ProtectedRoute>,
            ),
        },
        {
            path: '/batch-orders',
            ...lazyPage(() => import('@/modules/batch-orders/views/BatchOrdersView').then(m => m.BatchOrdersView), 'BATCH_ORDERS'),
        },
        {
            path: '/products',
            ...lazyGatedPage(() => import('@/modules/products/views/ProductListView').then(m => m.ProductListView), 'PRODUCTS', PRODUCTS_BENEFITS, 'PRODUCTS_VIEW'),
        },
        {
            path: '/products/:id',
            ...lazyGatedPage(() => import('@/modules/products/views/ProductDetailView').then(m => m.ProductDetailView), 'PRODUCTS', PRODUCTS_BENEFITS, 'PRODUCTS_VIEW'),
        },
        // Landing page for users whose role grants no permissions; see getDefaultRoute.
        {
            path: '/no-access',
            element: page(<NoAccessView />),
        },
        // Task inbox for roles without dashboard access (self-service backend, no permission).
        {
            path: '/notifications',
            ...lazyPage(() => import('@/modules/notifications/views/NotificationsView').then(m => m.NotificationsView)),
        },

        {
            path: '*',
            element: page(<HomeRedirect />),
        },
        ],
    },
]);
