import { useCallback } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import type { PermissionRequirement } from './catalog';
import { getDefaultRoute, hasPermission } from './helpers';

/**
 * Permission checks for the logged-in user.
 *
 * `can` accepts a single permission code or an ANY-OF array:
 *   const { can } = usePermissions();
 *   can('CUSTOMERS_VIEW')
 *   can(['FINANCE_INVOICES', 'FINANCE_VIEW_REPORTS'])
 */
export function usePermissions() {
    const { user } = useAuth();

    const can = useCallback(
        (required: PermissionRequirement) => hasPermission(user, required),
        [user],
    );

    return {
        can,
        /** Studio owner — unrestricted access (permissions == null in /auth/me). */
        isOwner: user != null && user.permissions == null,
        /** First route this user is allowed to see; used by "/" and unknown paths. */
        defaultRoute: getDefaultRoute(user),
    };
}
