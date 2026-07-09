import type { User } from '@/modules/auth/types';
import type { PermissionCode, PermissionRequirement } from './catalog';

/**
 * Checks the user's effective permissions (computed by the backend and
 * delivered via /auth/me). An array requirement means ANY-OF.
 *
 * Conventions:
 * - `user.permissions == null` → studio owner → full access,
 * - no user → no access (routes behind ProtectedRoute never hit this).
 */
export function hasPermission(user: User | null, required: PermissionRequirement): boolean {
    if (!user) return false;
    const granted = user.permissions;
    if (granted == null) return true;
    const codes = Array.isArray(required) ? required : [required];
    return codes.some((code: PermissionCode) => granted.includes(code));
}

/**
 * Where "/" (and any unknown path) should land for this user. Mirrors the
 * pre-permissions behaviour for owners (customers first), and silently picks
 * the first area the user can access otherwise — never a "no access" screen.
 * The dashboard is available to every authenticated user, so it is the
 * universal fallback.
 */
export function getDefaultRoute(user: User | null): string {
    const candidates: Array<{ path: string; requires: PermissionRequirement }> = [
        { path: '/customers', requires: 'CUSTOMERS_VIEW' },
        { path: '/calendar', requires: 'VISITS_VIEW' },
        { path: '/leads', requires: 'LEADS_MANAGE' },
        { path: '/finances', requires: ['FINANCE_INVOICES', 'FINANCE_MANAGE_CASH_REGISTER', 'FINANCE_VIEW_REPORTS'] },
        { path: '/statistics', requires: 'STATISTICS_VIEW' },
    ];
    const match = candidates.find(({ requires }) => hasPermission(user, requires));
    return match?.path ?? '/dashboard';
}
