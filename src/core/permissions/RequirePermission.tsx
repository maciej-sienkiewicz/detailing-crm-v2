import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import type { PermissionRequirement } from './catalog';
import { getDefaultRoute, hasPermission } from './helpers';

interface RequirePermissionProps {
    /** Single code or ANY-OF list the user must hold to see this route. */
    anyOf: PermissionRequirement;
    children: ReactNode;
}

/**
 * Route-level permission gate. Renders children when the user holds the
 * required permission; otherwise silently redirects to the user's default
 * route — deliberately no "access denied" screen, matching the UX rule that
 * inaccessible areas simply do not exist for the user. This also covers
 * manual URL entry (e.g. typing /finances into the address bar).
 *
 * Must be rendered inside ProtectedRoute (auth already resolved). The real
 * enforcement lives on the backend (@RequiresPermission → 403); this gate is
 * UX, not security.
 */
export function RequirePermission({ anyOf, children }: RequirePermissionProps) {
    const { user } = useAuth();

    if (!hasPermission(user, anyOf)) {
        return <Navigate to={getDefaultRoute(user)} replace />;
    }

    return <>{children}</>;
}
