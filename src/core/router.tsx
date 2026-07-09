// src/core/router.tsx
import { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
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
import { MobileVoiceCommandsWrapper, MobileShortcutsView } from '@/modules/voice-commands';
import { LoginView, SignupView, ForgotPasswordView, ResetPasswordView } from '@/modules/auth';
import { AppointmentColorListView } from "@/modules/appointment-colors";
import { ConsentSettingsView } from "@/modules/consents";
import { CalendarPageView } from "@/modules/calendar";
import { ProtocolRulesView, ProtocolDemoView } from "@/modules/protocols";
import { LeadListView } from "@/modules/leads";
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequirePermission, HomeRedirect, ANY_FINANCE } from './permissions';
import type { PermissionRequirement } from './permissions';
import {DashboardView} from "@/modules/dashboard";
import {GrowthEngineView} from "@/modules/growth-engine";
import {FinanceView} from "@/modules/finance";
import { StatisticsView, CategoryDetailView, DelayStatisticsView } from "@/modules/statistics";
import { CompetitionMonitoringView } from "@/modules/competition-monitoring";
import { SmsCampaignsView } from "@/modules/sms-campaigns";
import { GalleryView } from "@/modules/gallery/views/GalleryView";
import { EmployeeListView, EmployeeDetailView } from '@/modules/employees';
import { SettingsView } from '@/modules/settings';

/**
 * Authenticated app page: session guard + optional permission guard + layout.
 * When `requires` is missing the page is available to every logged-in user.
 * Users lacking the permission are silently redirected to their default
 * route (no "access denied" screen) — including manual URL entry.
 */
const page = (view: ReactNode, requires?: PermissionRequirement) => (
    <ProtectedRoute>
        {requires
            ? <RequirePermission anyOf={requires}><Layout>{view}</Layout></RequirePermission>
            : <Layout>{view}</Layout>}
    </ProtectedRoute>
);

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
        path: '/',
        element: page(<HomeRedirect />),
    },
    {
        path: '/dashboard',
        element: page(<DashboardView />),
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
        path: '/appointment-colors',
        element: page(<AppointmentColorListView />, 'VISITS_VIEW'),
    },
    {
        path: '/gallery',
        element: page(<GalleryView />, 'VISITS_VIEW'),
    },
    {
        path: '/protocols',
        element: page(<ProtocolRulesView />, 'VISITS_DOCUMENTS_MANAGE'),
    },
    {
        path: '/protocols/demo',
        element: page(<ProtocolDemoView />, 'VISITS_DOCUMENTS_MANAGE'),
    },

    // ── Mobile (public, token-based) ─────────────────────────────────────
    {
        // Public mobile upload route — no auth required, token via ?t=
        path: '/m/upload',
        element: <MobilePhotoUploadWrapper />,
    },
    {
        // Public voice intake route — no auth required, token via ?token=
        path: '/m/voice',
        element: <MobileVoiceCommandsWrapper />,
    },
    {
        path: '/mobile-shortcuts',
        element: page(<MobileShortcutsView />, 'VISITS_VIEW'),
    },

    // ── Leady ────────────────────────────────────────────────────────────
    {
        path: '/leads',
        element: page(<LeadListView />, 'LEADS_MANAGE'),
    },

    // ── Finanse ──────────────────────────────────────────────────────────
    {
        path: '/finance',
        element: page(<FinanceView />, ANY_FINANCE),
    },
    {
        path: '/finances',
        element: page(<FinanceView />, ANY_FINANCE),
    },

    // ── Statystyki i raporty ─────────────────────────────────────────────
    {
        path: '/statistics',
        element: page(<StatisticsView />, 'STATISTICS_VIEW'),
    },
    {
        path: '/statistics/delays',
        element: page(<DelayStatisticsView />, 'STATISTICS_VIEW'),
    },
    {
        path: '/statistics/categories/:categoryId',
        element: page(<CategoryDetailView />, 'STATISTICS_VIEW'),
    },
    {
        path: '/reports',
        element: page(<GrowthEngineView />, 'STATISTICS_VIEW'),
    },

    // ── Komunikacja i marketing ──────────────────────────────────────────
    {
        path: '/sms-campaigns',
        element: page(<SmsCampaignsView />, 'COMMUNICATION_SEND'),
    },
    {
        path: '/instagram',
        element: page(<CompetitionMonitoringView />),
    },
    {
        path: '/consents',
        element: page(<ConsentSettingsView />, 'CUSTOMERS_VIEW'),
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

    // ── Ustawienia (zakładki filtrowane wewnątrz widoku) ─────────────────
    {
        path: '/settings',
        element: page(<SettingsView />),
    },

    {
        path: '*',
        element: page(<HomeRedirect />),
    },
]);
