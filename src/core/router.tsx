import { createBrowserRouter, Navigate } from 'react-router-dom';
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
import { PermissionGate } from './components/PermissionGate';
import {DashboardView} from "@/modules/dashboard";
import {GrowthEngineView} from "@/modules/growth-engine";
import {FinanceView} from "@/modules/finance";
import { StatisticsView, CategoryDetailView, DelayStatisticsView } from "@/modules/statistics";
import { CompetitionMonitoringView } from "@/modules/competition-monitoring";
import { SmsCampaignsView } from "@/modules/sms-campaigns";
import { GalleryView } from "@/modules/gallery/views/GalleryView";
import { ComingSoonView } from "@/common/components/ComingSoonView";
import { EmployeeListView, EmployeeDetailView } from '@/modules/employees';
import { SettingsView } from '@/modules/settings';
import React from 'react';

// Shorthand: ProtectedRoute + Layout + optional PermissionGate
const route = (
    element: React.ReactElement,
    permission?: string,
    anyPermission?: string[]
) => (
    <ProtectedRoute>
        <Layout>
            {(permission || anyPermission)
                ? <PermissionGate permission={permission} anyPermission={anyPermission}>{element}</PermissionGate>
                : element
            }
        </Layout>
    </ProtectedRoute>
);

export const router = createBrowserRouter([
    // ── Auth (public) ───────────────────────────────────────────────────────
    { path: '/login',           element: <LoginView /> },
    { path: '/signup',          element: <SignupView /> },
    { path: '/forgot-password', element: <ForgotPasswordView /> },
    { path: '/reset-password',  element: <ResetPasswordView /> },

    // ── Public mobile routes — no auth required ──────────────────────────────
    { path: '/m/upload', element: <MobilePhotoUploadWrapper /> },
    { path: '/m/voice',  element: <MobileVoiceCommandsWrapper /> },

    // ── Authenticated routes ─────────────────────────────────────────────────
    { path: '/', element: route(<Navigate to="/dashboard" replace />) },

    // Dashboard — dostępny dla wszystkich zalogowanych
    { path: '/dashboard', element: route(<DashboardView />) },

    // Wizyty i kalendarz — VISITS_VIEW
    { path: '/calendar',                            element: route(<CalendarPageView />,     'VISITS_VIEW') },
    { path: '/operations',                          element: route(<OperationListView />,     'VISITS_VIEW') },
    { path: '/visits/:visitId',                     element: route(<VisitDetailView />,       'VISITS_VIEW') },
    { path: '/gallery',                             element: route(<GalleryView />,           'VISITS_VIEW') },
    { path: '/appointments/:appointmentId/edit',    element: route(<AppointmentEditView />,   'VISITS_VIEW') },

    // Tworzenie wizyty — VISITS_CREATE
    { path: '/appointments/create',                 element: route(<AppointmentCreateView />, 'VISITS_CREATE') },
    { path: '/checkin/new',                         element: route(<WalkInCheckInWrapper />,  'VISITS_CREATE') },
    { path: '/reservations/:reservationId/checkin', element: route(<CheckInWizardWrapper />,  'VISITS_CREATE') },

    // Klienci — CUSTOMERS_VIEW
    { path: '/customers',              element: route(<CustomerListView />,   'CUSTOMERS_VIEW') },
    { path: '/customers/:customerId',  element: route(<CustomerDetailView />, 'CUSTOMERS_VIEW') },

    // Pojazdy — VISITS_VIEW (samochód jest powiązany z wizytą, nie ma własnego modułu uprawnień)
    { path: '/vehicles',             element: route(<VehicleListView />,   'VISITS_VIEW') },
    { path: '/vehicles/:vehicleId',  element: route(<VehicleDetailView />, 'VISITS_VIEW') },

    // Finanse — FINANCE_INVOICES lub FINANCE_VIEW_REPORTS (wystarczy jedno)
    { path: '/finance',  element: route(<FinanceView />, undefined, ['FINANCE_INVOICES', 'FINANCE_VIEW_REPORTS']) },
    { path: '/finances', element: route(<FinanceView />, undefined, ['FINANCE_INVOICES', 'FINANCE_VIEW_REPORTS']) },

    // Statystyki — STATISTICS_VIEW
    { path: '/statistics',                          element: route(<StatisticsView />,         'STATISTICS_VIEW') },
    { path: '/statistics/delays',                   element: route(<DelayStatisticsView />,    'STATISTICS_VIEW') },
    { path: '/statistics/categories/:categoryId',   element: route(<CategoryDetailView />,     'STATISTICS_VIEW') },

    // Growth Engine (raporty) — STATISTICS_VIEW lub FINANCE_VIEW_REPORTS
    { path: '/reports', element: route(<GrowthEngineView />, undefined, ['STATISTICS_VIEW', 'FINANCE_VIEW_REPORTS']) },

    // Pracownicy — EMPLOYEES_MANAGE
    { path: '/team',             element: route(<EmployeeListView />,   'EMPLOYEES_MANAGE') },
    { path: '/team/:employeeId', element: route(<EmployeeDetailView />, 'EMPLOYEES_MANAGE') },

    // Leady — LEADS_MANAGE
    { path: '/leads', element: route(<LeadListView />, 'LEADS_MANAGE') },

    // Komunikacja — COMMUNICATION_SEND
    { path: '/sms-campaigns', element: route(<SmsCampaignsView />, 'COMMUNICATION_SEND') },

    // Marketing — bez ograniczeń uprawnień (brak wrażliwych danych klientów)
    { path: '/instagram',      element: route(<CompetitionMonitoringView />) },
    { path: '/google-reviews', element: route(<ComingSoonView />) },

    // Ustawienia — brak ograniczeń (właściciel zarządza rolami; pracownicy mogą mieć swoje preferencje)
    { path: '/settings',           element: route(<SettingsView />) },
    { path: '/appointment-colors', element: route(<AppointmentColorListView />) },
    { path: '/consents',           element: route(<ConsentSettingsView />) },
    { path: '/protocols',          element: route(<ProtocolRulesView />) },
    { path: '/protocols/demo',     element: route(<ProtocolDemoView />) },
    { path: '/mobile-shortcuts',   element: route(<MobileShortcutsView />) },

    // Catch-all
    { path: '*', element: route(<Navigate to="/dashboard" replace />) },
]);
