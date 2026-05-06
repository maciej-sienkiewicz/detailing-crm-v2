// src/core/router.tsx - Zaktualizuj istniejący plik
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
import { LoginView, SignupView } from '@/modules/auth';
import { AppointmentColorListView } from "@/modules/appointment-colors";
import { ConsentSettingsView } from "@/modules/consents";
import { CalendarPageView } from "@/modules/calendar";
import { ProtocolRulesView, ProtocolDemoView } from "@/modules/protocols";
import { LeadListView } from "@/modules/leads";
import { ProtectedRoute } from './components/ProtectedRoute';
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
import { TrendsView } from '@/modules/trends';

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
        path: '/',
        element: (
            <ProtectedRoute>
                <Layout><Navigate to="/customers" replace /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/customers',
        element: (
            <ProtectedRoute>
                <Layout><CustomerListView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/customers/:customerId',
        element: (
                <Layout><CustomerDetailView /></Layout>
        ),
    },
    {
        path: '/calendar',
        element: (
            <ProtectedRoute>
                <Layout><CalendarPageView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard',
        element: (
            <ProtectedRoute>
                <Layout><DashboardView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/appointments/create',
        element: (
            <ProtectedRoute>
                <Layout><AppointmentCreateView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/appointments/:appointmentId/edit',
        element: (
                <Layout><AppointmentEditView /></Layout>
        ),
    },
    {
        path: '/vehicles',
        element: (
            <ProtectedRoute>
                <Layout><VehicleListView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/vehicles/:vehicleId',
        element: (
            <ProtectedRoute>
                <Layout><VehicleDetailView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/operations',
        element: (
            <ProtectedRoute>
                <Layout><OperationListView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/visits/:visitId',
        element: (
            <ProtectedRoute>
                <Layout><VisitDetailView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/checkin/new',
        element: (
            <ProtectedRoute>
                <Layout>
                    <WalkInCheckInWrapper />
                </Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/reservations/:reservationId/checkin',
        element: (
            <ProtectedRoute>
                <Layout>
                    <CheckInWizardWrapper />
                </Layout>
            </ProtectedRoute>
        ),
    },
    {
        // Public mobile upload route — no auth required, token via ?t=
        path: '/m/upload',
        element: <MobilePhotoUploadWrapper />,
    },
    {
        path: '/appointment-colors',
        element: (
            <ProtectedRoute>
                <Layout><AppointmentColorListView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/consents',
        element: (
            <ProtectedRoute>
                <Layout><ConsentSettingsView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/protocols',
        element: (
            <ProtectedRoute>
                <Layout><ProtocolRulesView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/protocols/demo',
        element: (
            <ProtectedRoute>
                <Layout><ProtocolDemoView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/leads',
        element: (
            <ProtectedRoute>
                <Layout><LeadListView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/reports',
        element: (
            <ProtectedRoute>
                <Layout><GrowthEngineView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/finance',
        element: (
            <ProtectedRoute>
                <Layout><FinanceView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/statistics',
        element: (
            <ProtectedRoute>
                <Layout><StatisticsView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/statistics/delays',
        element: (
            <ProtectedRoute>
                <Layout><DelayStatisticsView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/statistics/categories/:categoryId',
        element: (
            <ProtectedRoute>
                <Layout><CategoryDetailView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/instagram',
        element: (
            <ProtectedRoute>
                <Layout><CompetitionMonitoringView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/sms-campaigns',
        element: (
            <ProtectedRoute>
                <Layout><SmsCampaignsView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/gallery',
        element: (
            <ProtectedRoute>
                <Layout><GalleryView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/finances',
        element: (
            <ProtectedRoute>
                <Layout><FinanceView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/reports',
        element: (
            <ProtectedRoute>
                <Layout><ComingSoonView pageName="Raporty" /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/team',
        element: (
            <ProtectedRoute>
                <Layout><EmployeeListView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/team/:employeeId',
        element: (
            <ProtectedRoute>
                <Layout><EmployeeDetailView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/google-trends',
        element: (
            <ProtectedRoute>
                <Layout><TrendsView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/settings',
        element: (
            <ProtectedRoute>
                <Layout><SettingsView /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '*',
        element: (
            <ProtectedRoute>
                <Layout><Navigate to="/customers" replace /></Layout>
            </ProtectedRoute>
        ),
    },
]);