import type { User } from '@/modules/auth/types';
import type { AccessRequirement, PermissionCode, PermissionRequirement } from './catalog';

/**
 * Checks the user's effective permissions (computed by the backend and
 * delivered via /auth/me). An array requirement means ANY-OF.
 *
 * Conventions:
 * - `user.permissions == null` → studio owner → full access,
 * - `'OWNER_ONLY'` requirement → only the studio owner passes,
 * - no user → no access (routes behind ProtectedRoute never hit this).
 */
export function hasPermission(user: User | null, required: AccessRequirement): boolean {
    if (!user) return false;
    const granted = user.permissions;
    if (required === 'OWNER_ONLY') return granted == null;
    if (granted == null) return true;
    const codes = Array.isArray(required) ? required : [required];
    return codes.some((code: PermissionCode) => granted.includes(code));
}

/**
 * Where "/" (and any unknown path) should land for this user. Mirrors the
 * pre-permissions behaviour for owners (customers first), and silently picks
 * the first area the user can access otherwise, never a "no access" screen
 * for anyone with at least one permission.
 *
 * Every permission in the catalog implies VISITS_VIEW through the dependency
 * graph, so the /dashboard fallback is reachable for any non-empty permission
 * set. A user with an empty set (no role, or a role with nothing enabled)
 * lands on /worktime when they track work time, otherwise on /no-access;
 * never in a redirect loop.
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
    if (match) return match.path;
    if (hasPermission(user, 'VISITS_VIEW')) return '/dashboard';
    // No permissions at all: the task inbox ("Powiadomienia") is their home,
    // since it is self-service on the backend and shows work assigned to them.
    return '/notifications';
}
