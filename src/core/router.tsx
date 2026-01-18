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
import { MobilePhotoUploadWrapper } from '@/modules/checkin/views/MobilePhotoUploadWrapper';
import { LoginView, SignupView } from '@/modules/auth';
import { ServiceListView } from "@/modules/services";
import { AppointmentColorListView } from "@/modules/appointment-colors";
import { ConsentSettingsView } from "@/modules/consents";
import { CalendarPageView } from "@/modules/calendar";
import { ProtocolRulesView, ProtocolDemoView } from "@/modules/protocols";
import { ProtectedRoute } from './components/ProtectedRoute';

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
        path: '/checkin/mobile/:sessionId',
        element: (
            <ProtectedRoute>
                <MobilePhotoUploadWrapper />
            </ProtectedRoute>
        ),
    },
    {
        path: '/services',
        element: (
            <ProtectedRoute>
                <Layout><ServiceListView /></Layout>
            </ProtectedRoute>
        ),
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
        path: '*',
        element: (
            <ProtectedRoute>
                <Layout><Navigate to="/customers" replace /></Layout>
            </ProtectedRoute>
        ),
    },
]);