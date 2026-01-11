import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/widgets/Layout';
import { CustomerListView } from '@/modules/customers';
import { CustomerDetailView } from '@/modules/customers/views/CustomerDetailView';
import { AppointmentCreateView } from '@/modules/appointments';
import {VehicleDetailView, VehicleListView} from "@/modules/vehicles";

export const router = createBrowserRouter([
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
        path: 'vehicles',
        element: <Layout><VehicleListView /></Layout>,
    },
    {
        path: 'vehicles/:vehicleId',
        element: <Layout><VehicleDetailView /></Layout>,
    },
    {
        path: '*',
        element: <Layout><Navigate to="/customers" replace /></Layout>,
    },
]);