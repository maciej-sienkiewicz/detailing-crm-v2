import type { User } from '@/modules/auth/types';
import type { AccessRequirement, PermissionCode, PermissionRequirement } from './catalog';
import { ANY_DASHBOARD } from './catalog';

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
 * Where "/" (and any unknown path) should land for this user. Domyślnym ekranem
 * po zalogowaniu (i po otwarciu PWA - manifest kieruje na "/dashboard", które
 * przy braku uprawnień przekierowuje z powrotem tutaj) jest "Tablica": to ona
 * niesie skróty i widok dnia, którego użytkownik szuka od razu po wejściu.
 *
 * Kto nie ma dostępu do Tablicy (potrzeba przynajmniej jednego uprawnienia
 * spoza samego kalendarza - patrz ANY_DASHBOARD), ląduje na pierwszym module,
 * który wolno mu otworzyć. Kolejność odzwierciedla, gdzie taki użytkownik ma
 * naprawdę robić robotę: kalendarz przed listą klientów, leady przed
 * finansami. BATCH_ORDERS to samodzielny korzeń bez kalendarza ani kartoteki
 * - musi tu być, bo bez niego kontrahent B2B lądował na powiadomieniach mimo
 * pełnego własnego widoku.
 *
 * Użytkownik z pustym zestawem (bez roli albo z rolą bez zaznaczeń) trafia na
 * /notifications - nigdy w pętlę przekierowań.
 */
export function getDefaultRoute(user: User | null): string {
    if (hasPermission(user, ANY_DASHBOARD)) return '/dashboard';
    const candidates: Array<{ path: string; requires: PermissionRequirement }> = [
        { path: '/calendar', requires: 'VISITS_VIEW' },
        { path: '/customers', requires: 'CUSTOMERS_VIEW' },
        { path: '/leads', requires: 'LEADS_MANAGE' },
        { path: '/finances', requires: ['FINANCE_INVOICES', 'FINANCE_MANAGE_CASH_REGISTER', 'FINANCE_VIEW_REPORTS'] },
        { path: '/statistics', requires: 'STATISTICS_VIEW' },
        { path: '/batch-orders', requires: 'BATCH_ORDERS' },
    ];
    const match = candidates.find(({ requires }) => hasPermission(user, requires));
    if (match) return match.path;
    // No permissions at all: the task inbox ("Powiadomienia") is their home,
    // since it is self-service on the backend and shows work assigned to them.
    return '/notifications';
}
