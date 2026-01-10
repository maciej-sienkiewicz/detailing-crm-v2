import { createBrowserRouter, Navigate } from 'react-router-dom';
import { CustomerListView } from '@/modules/customers';
import {CustomerDetailView} from "@/modules/customers/views/CustomerDetailView.tsx";

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/customers" replace />,
    },
    {
        path: '/customers',
        element: <CustomerListView />,
    },
    {
        path: '*',
        element: <Navigate to="/customers" replace />,
    },
    {
        path: '/customers/:customerId',
        element: <CustomerDetailView />,
    }
]);