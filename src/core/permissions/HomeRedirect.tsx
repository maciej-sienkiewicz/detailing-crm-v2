import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { getDefaultRoute } from './helpers';

/**
 * Landing redirect for "/" and unknown paths: sends the user to the first
 * module they are allowed to see (owners keep the historical /customers).
 */
export function HomeRedirect() {
    const { user } = useAuth();
    return <Navigate to={getDefaultRoute(user)} replace />;
}
