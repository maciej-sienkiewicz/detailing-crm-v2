// src/core/router.tsx - Zaktualizuj istniejący plik
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/widgets/Layout';
import { CustomerListView } from '@/modules/customers';
import { CustomerDetailView } from '@/modules/customers/views/CustomerDetailView';
import { AppointmentCreateView } from '@/modules/appointments';
import { VehicleDetailView, VehicleListView } from '@/modules/vehicles';
import { OperationListView } from '@/modules/operations';
import { VisitDetailView } from '@/modules/visits';
import { CheckInWizardWrapper } from '@/modules/checkin/views/CheckInWizardWrapper';
import { MobilePhotoUploadWrapper } from '@/modules/checkin/views/MobilePhotoUploadWrapper';
import { LoginView, SignupView } from '@/modules/auth';

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
        element: <Layout><Navigate to="/customers" replace /></Layout>,
    },
    {
        path: '/customers',
        element: <Layout><CustomerListView /></Layout>,
    },
    {
        path: '/customers/:customerId',
        element: <Layout><CustomerDetailView /></Layout>,
    },
    {
        path: '/appointments/create',
        element: <Layout><AppointmentCreateView /></Layout>,
    },
    {
        path: '/vehicles',
        element: <Layout><VehicleListView /></Layout>,
    },
    {
        path: '/vehicles/:vehicleId',
        element: <Layout><VehicleDetailView /></Layout>,
    },
    {
        path: '/operations',
        element: <Layout><OperationListView /></Layout>,
    },
    {
        path: '/visits/:visitId',
        element: <Layout><VisitDetailView /></Layout>,
    },
    {
        path: '/reservations/:reservationId/checkin',
        element: (
            <Layout>
                <CheckInWizardWrapper />
            </Layout>
        ),
    },
    {
        path: '/checkin/mobile/:sesżźćsionId',
        element: <MobilePhotoUploadWrapper />,
    },
    {
        path: '*',
        element: <Layout><Navigate to="/customers" replace /></Layout>,
    },
]);