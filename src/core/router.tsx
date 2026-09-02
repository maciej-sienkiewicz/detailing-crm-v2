// src/core/router.tsx
import { ReactNode, Suspense, lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/widgets/Layout';
import { CustomerListView } from '@/modules/customers';
import { CustomerDetailView } from '@/modules/customers/views/CustomerDetailView';
import { AppointmentCreateView, AppointmentEditView } from '@/modules/appointments';
import { VehicleDetailView, VehicleListView } from '@/modules/vehicles';
import { OperationListView } from '@/modules/operations';
import { VisitDetailView } from '@/modules/visits';
import { CheckInWizardWrapper } from '@/modules/checkin/views/CheckInWizardWrapper';
import { WalkInCheckInWrapper } from '@/modules/checkin/views/WalkInCheckInWrapper';
import { MobilePhotoUploadWrapper } from '@/modules/checkin/views/MobilePhotoUploadWrapper';
import { MobileContactsImportView } from '@/modules/customers/views/MobileContactsImportView';
import { MobileVoiceCommandsWrapper, MobileShortcutsView } from '@/modules/voice-commands';
import { LoginView, SignupView, ForgotPasswordView, ResetPasswordView } from '@/modules/auth';
import { VisitCardView } from '@/modules/visit-card';

// Lazy: pulls in pdf.js, which must not weigh down the main bundle
const PublicSigningView = lazy(() => import('@/modules/public-signing/views/PublicSigningView'));
import { ConsentSettingsView } from "@/modules/consents";
import { CalendarPageView } from "@/modules/calendar";
import { ProtocolRulesView, ProtocolDemoView } from "@/modules/protocols";
import { BatchOrdersView } from "@/modules/batch-orders";
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequirePermission, HomeRedirect, NoAccessView, ANY_FINANCE, ANY_DASHBOARD } from './permissions';
import { NotificationsView } from '@/modules/notifications';
import type { PermissionRequirement } from './permissions';
import {DashboardView} from "@/modules/dashboard";
import {GrowthEngineView} from "@/modules/growth-engine";
import {FinanceView} from "@/modules/finance";
import { StatisticsView, CategoryDetailView, CostsView } from "@/modules/statistics";
import { LiveMetricsView } from "@/modules/live-metrics";
import { CompetitionMonitoringView } from "@/modules/competition-monitoring";
import { SmsCampaignsView } from "@/modules/sms-campaigns";
import { CampaignsListView, CampaignWizardView, CampaignDetailsView, CampaignSettingsView } from "@/modules/campaigns";
// Lazy: a heavy, styled-components-rich module most sessions never open
const GalleryView = lazy(() =>
    import("@/modules/gallery/views/GalleryView").then(m => ({ default: m.GalleryView }))
);
// Lazy — moduł komunikacji (webmail) i leadów
const MailView = lazy(() => import('@/modules/comms/views/MailView'));
const MailboxConnectView = lazy(() => import('@/modules/comms/views/MailboxConnectView'));
const LeadsView = lazy(() => import('@/modules/comms/views/LeadsView'));
const LeadAnalyticsView = lazy(() => import('@/modules/comms/views/LeadAnalyticsView'));
import { EmployeeListView, EmployeeDetailView } from '@/modules/employees';
import { WorkTimeView } from '@/modules/worktime';
import { ActivityView } from '@/modules/activity';
import { SettingsView } from '@/modules/settings';
import { PhoneSignatureView } from '@/modules/profile/views/PhoneSignatureView';
import { CallDeviceView } from '@/modules/push';
import { PaymentResultPage } from '@/modules/subscription/pages/PaymentResultPage';
import { ModuleGate } from '@/modules/subscription/components/ModuleGate';
import type { FeatureKey } from '@/modules/subscription/types';

/**
 * Authenticated app page: session guard + optional permission guard + layout.
 * When `requires` is missing the page is available to every logged-in user.
 * Users lacking the permission are silently redirected to their default
 * route (no "access denied" screen), including manual URL entry.
 */
const page = (view: ReactNode, requires?: PermissionRequirement) => (
    <ProtectedRoute>
        {requires
            ? <RequirePermission anyOf={requires}><Layout>{view}</Layout></RequirePermission>
            : <Layout>{view}</Layout>}
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
    'Raporty przychodów i rentowności usług',
    'Statystyki kategorii i najpopularniejszych usług',
    'Analiza opóźnień i wąskich gardeł w pracy studia',
];
const CAMPAIGNS_BENEFITS = [
    'Masowe kampanie SMS i e-mail do bazy klientów',
    'Segmentacja odbiorców i personalizacja treści',
    'Historia i skuteczność wysyłek',
];
const INSTAGRAM_BENEFITS = [
    'Śledzenie profili konkurencji na Instagramie',
    'Analiza trendów i najpopularniejszych treści',
    'Inspiracje do własnych publikacji',
];
const E_SIGNATURES_BENEFITS = [
    'Elektroniczne podpisywanie dokumentów na tablecie',
    'Zgody i regulaminy podpisywane bez papieru',
    'Bezpieczne archiwum podpisanych dokumentów',
];

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginView />,
    },
    {
        path: '/signup',
        element: <SignupView />,
    },
    {
        path: '/forgot-password',
        element: <ForgotPasswordView />,
    },
    {
        path: '/reset-password',
        element: <ResetPasswordView />,
    },
    {
        path: '/confirm-password',
        element: <ResetPasswordView mode="setup" />,
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
        element: page(<DashboardView />, ANY_DASHBOARD),
    },

    // ── Klienci i pojazdy ────────────────────────────────────────────────
    {
        path: '/customers',
        element: page(<CustomerListView />, 'CUSTOMERS_VIEW'),
    },
    {
        path: '/customers/:customerId',
        element: page(<CustomerDetailView />, 'CUSTOMERS_VIEW'),
    },
    {
        path: '/vehicles',
        element: page(<VehicleListView />, 'CUSTOMERS_VIEW'),
    },
    {
        path: '/vehicles/:vehicleId',
        element: page(<VehicleDetailView />, 'CUSTOMERS_VIEW'),
    },

    // ── Wizyty i kalendarz ───────────────────────────────────────────────
    {
        path: '/calendar',
        element: page(<CalendarPageView />, 'VISITS_VIEW'),
    },
    {
        path: '/operations',
        element: page(<OperationListView />, 'VISITS_VIEW'),
    },
    {
        path: '/visits/:visitId',
        element: page(<VisitDetailView />, 'VISITS_VIEW'),
    },
    {
        path: '/appointments/create',
        element: page(<AppointmentCreateView />, 'VISITS_CREATE'),
    },
    {
        path: '/appointments/:appointmentId/edit',
        element: page(<AppointmentEditView />, 'VISITS_CREATE'),
    },
    {
        path: '/checkin/new',
        element: page(<WalkInCheckInWrapper />, 'VISITS_CREATE'),
    },
    {
        path: '/reservations/:reservationId/checkin',
        element: page(<CheckInWizardWrapper />, 'VISITS_CREATE'),
    },
    {
        // Kolory przeniosły się do Ustawień → Oznaczenia. Adres zostaje, bo
        // krąży w zakładkach i linkach — prowadzi teraz tam, gdzie widok jest.
        path: '/appointment-colors',
        element: <Navigate to="/settings?tab=labels&view=colors" replace />,
    },
    {
        path: '/gallery',
        element: page(
            <Suspense fallback={null}>
                <GalleryView />
            </Suspense>,
            'VISITS_VIEW'
        ),
    },
    {
        path: '/protocols',
        element: page(<ProtocolRulesView />, 'VISITS_CREATE'),
    },
    {
        path: '/protocols/demo',
        element: page(<ProtocolDemoView />, 'VISITS_CREATE'),
    },

    // ── Mobile (public, token-based) ─────────────────────────────────────
    {
        // Public mobile upload route, no auth required, token via ?t=
        path: '/m/upload',
        element: <MobilePhotoUploadWrapper />,
    },
    {
        // Publiczny odbiór kontaktów z telefonu, bez logowania; sekret sesji w ?s=
        path: '/m/contacts',
        element: <MobileContactsImportView />,
    },
    {
        // Public voice intake route, no auth required, token via ?token=
        path: '/m/voice',
        element: <MobileVoiceCommandsWrapper />,
    },
    {
        // Public customer Visit Card, no auth required, card token in the path
        path: '/vc/:token',
        element: <VisitCardView />,
    },
    {
        // Public remote document signing (SMS link), no auth, link token in the path
        path: '/sign/:token',
        element: (
            <Suspense fallback={null}>
                <PublicSigningView />
            </Suspense>
        ),
    },
    {
        // Personal signature drawing on the user's own phone, no auth, link token in the path
        path: '/m/sig/:token',
        element: <PhoneSignatureView />,
    },
    {
        path: '/mobile-shortcuts',
        element: page(<MobileShortcutsView />, 'VISITS_VIEW'),
    },
    {
        // Click-to-Call pairing, opened ON THE PHONE (QR in Skróty mobilne).
        // No permission requirement: every logged-in user may pair their own
        // phone — the backend scopes devices and call pushes to the session user.
        path: '/call-device',
        element: page(<CallDeviceView />),
    },

    // ── Leady ────────────────────────────────────────────────────────────
    {
        path: '/leads',
        element: page(
            <Suspense fallback={null}>
                <LeadsView />
            </Suspense>,
            'LEADS_MANAGE'
        ),
    },
    {
        path: '/leads/analytics',
        element: page(
            <Suspense fallback={null}>
                <LeadAnalyticsView />
            </Suspense>,
            'LEADS_MANAGE'
        ),
    },

    // ── Komunikacja: skrzynka pocztowa ───────────────────────────────────
    {
        path: '/communication',
        element: page(
            <Suspense fallback={null}>
                <MailView />
            </Suspense>,
            'LEADS_MANAGE'
        ),
    },
    {
        path: '/communication/mailboxes',
        element: page(
            <Suspense fallback={null}>
                <MailboxConnectView />
            </Suspense>,
            'LEADS_MANAGE'
        ),
    },

    // ── Finanse ──────────────────────────────────────────────────────────
    {
        path: '/finance',
        element: gatedPage(<FinanceView />, 'FINANCE', FINANCE_BENEFITS, ANY_FINANCE),
    },
    {
        path: '/finances',
        element: gatedPage(<FinanceView />, 'FINANCE', FINANCE_BENEFITS, ANY_FINANCE),
    },

    // ── Statystyki i raporty ─────────────────────────────────────────────
    {
        path: '/statistics',
        element: gatedPage(<StatisticsView />, 'STATISTICS', STATISTICS_BENEFITS, 'STATISTICS_VIEW'),
    },
    {
        // Metryki na żywo NIE są za bramką modułu STATISTICS: backend chroni je samym
        // uprawnieniem STATISTICS_VIEW, a bramka w UI blokowałaby użytkowników, których
        // serwer i tak obsłuży.
        path: '/live-metrics',
        element: page(<LiveMetricsView />, 'STATISTICS_VIEW'),
    },
    {
        path: '/statistics/costs',
        element: gatedPage(<CostsView />, 'STATISTICS', STATISTICS_BENEFITS, 'STATISTICS_VIEW'),
    },
    {
        path: '/statistics/categories/:categoryId',
        element: gatedPage(<CategoryDetailView />, 'STATISTICS', STATISTICS_BENEFITS, 'STATISTICS_VIEW'),
    },
    {
        path: '/reports',
        element: gatedPage(<GrowthEngineView />, 'STATISTICS', STATISTICS_BENEFITS, 'STATISTICS_VIEW'),
    },

    // ── Komunikacja i marketing ──────────────────────────────────────────
    {
        path: '/campaigns',
        element: gatedPage(<CampaignsListView />, 'CAMPAIGNS', CAMPAIGNS_BENEFITS, 'COMMUNICATION_SEND'),
    },
    {
        path: '/campaigns/new',
        element: gatedPage(<CampaignWizardView />, 'CAMPAIGNS', CAMPAIGNS_BENEFITS, 'COMMUNICATION_SEND'),
    },
    {
        path: '/campaigns/settings',
        element: gatedPage(<CampaignSettingsView />, 'CAMPAIGNS', CAMPAIGNS_BENEFITS, 'COMMUNICATION_SEND'),
    },
    {
        path: '/campaigns/:id',
        element: gatedPage(<CampaignDetailsView />, 'CAMPAIGNS', CAMPAIGNS_BENEFITS, 'COMMUNICATION_SEND'),
    },
    {
        path: '/campaigns/:id/edit',
        element: gatedPage(<CampaignWizardView />, 'CAMPAIGNS', CAMPAIGNS_BENEFITS, 'COMMUNICATION_SEND'),
    },
    // Legacy: stara ścieżka kampanii SMS prowadzi do nowego modułu
    {
        path: '/sms-campaigns',
        element: gatedPage(<SmsCampaignsView />, 'CAMPAIGNS', CAMPAIGNS_BENEFITS, 'COMMUNICATION_SEND'),
    },
    {
        path: '/instagram',
        element: gatedPage(<CompetitionMonitoringView />, 'INSTAGRAM_MONITORING', INSTAGRAM_BENEFITS, 'MARKETING_MANAGE'),
    },
    {
        path: '/consents',
        element: gatedPage(<ConsentSettingsView />, 'E_SIGNATURES', E_SIGNATURES_BENEFITS, 'CUSTOMERS_VIEW'),
    },

    // ── Czas pracy (self-service dla pracowników z trackWorkTime) ────────
    {
        path: '/worktime',
        element: page(<WorkTimeView />),
    },

    // ── Historia aktywności ──────────────────────────────────────────────
    {
        path: '/activity',
        element: page(<ActivityView />, 'AUDIT_VIEW'),
    },

    // ── Zespół ───────────────────────────────────────────────────────────
    {
        path: '/team',
        element: page(<EmployeeListView />, 'EMPLOYEES_MANAGE'),
    },
    {
        path: '/team/:employeeId',
        element: page(<EmployeeDetailView />, 'EMPLOYEES_MANAGE'),
    },

    // ── Ustawienia (dodatkowo zakładki filtrowane wewnątrz widoku) ───────
    {
        path: '/settings',
        element: page(<SettingsView />),
    },

    // ── Powrót z płatności Przelewy24 ────────────────────────────────────
    // Bez SubscriptionGate: strona musi działać także dla wygasłych kont,
    // które właśnie opłaciły przedłużenie.
    {
        path: '/payments/result',
        element: (
            <ProtectedRoute withSubscriptionGate={false}>
                <PaymentResultPage />
            </ProtectedRoute>
        ),
    },
    {
        path: '/batch-orders',
        element: page(<BatchOrdersView />, 'BATCH_ORDERS'),
    },
    // Landing page for users whose role grants no permissions; see getDefaultRoute.
    {
        path: '/no-access',
        element: page(<NoAccessView />),
    },
    // Task inbox for roles without dashboard access (self-service backend, no permission).
    {
        path: '/notifications',
        element: page(<NotificationsView />),
    },

    {
        path: '*',
        element: page(<HomeRedirect />),
    },
]);
