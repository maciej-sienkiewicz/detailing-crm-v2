// ─── Permission catalog (frontend mirror) ───────────────────────────────────
// Mirrors the backend enum `pl.detailing.crm.role.domain.Permission`.
// The backend is the source of truth: it computes the user's EFFECTIVE
// permission set (dependency-graph closure: ancestors + implications,
// plus feature gating) and returns it from GET /api/v1/auth/me as
// `user.permissions`. `null` permissions = studio owner = unrestricted access.

export const PERMISSIONS = {
    // Wizyty i kalendarz
    VISITS_VIEW: 'VISITS_VIEW',
    VISITS_CREATE: 'VISITS_CREATE',
    VISITS_DELETE: 'VISITS_DELETE',
    VISITS_SERVICE_PRICES_VIEW: 'VISITS_SERVICE_PRICES_VIEW',
    VISITS_MEDIA_DELETE: 'VISITS_MEDIA_DELETE',
    // Klienci i pojazdy: sekcja modułu „Wizyty i kalendarz” (nie osobny moduł)
    CUSTOMERS_VIEW: 'CUSTOMERS_VIEW',
    CUSTOMERS_DELETE: 'CUSTOMERS_DELETE',
    // Finanse
    FINANCE_INVOICES: 'FINANCE_INVOICES',
    FINANCE_MANAGE_CASH_REGISTER: 'FINANCE_MANAGE_CASH_REGISTER',
    FINANCE_VIEW_REPORTS: 'FINANCE_VIEW_REPORTS',
    // Pracownicy
    EMPLOYEES_MANAGE: 'EMPLOYEES_MANAGE',
    EMPLOYEES_PAYROLL: 'EMPLOYEES_PAYROLL',
    // Komunikacja
    COMMUNICATION_SEND: 'COMMUNICATION_SEND',
    // Marketing
    MARKETING_MANAGE: 'MARKETING_MANAGE',
    // Statystyki
    STATISTICS_VIEW: 'STATISTICS_VIEW',
    // Leady
    LEADS_MANAGE: 'LEADS_MANAGE',
    // Zadania
    TASKS_VIEW: 'TASKS_VIEW',
    TASKS_MANAGE: 'TASKS_MANAGE',
    // Zlecenia zbiorcze: osobna kategoria w module „Wizyty i kalendarz",
    // niezależna od VISITS_VIEW. Obsługa kontrahenta B2B to własne stanowisko —
    // można nadać samo to uprawnienie i widok działa w całości.
    BATCH_ORDERS: 'BATCH_ORDERS',
    // Historia aktywności: feed przecina wszystkie moduły i pokazuje również
    // zdarzenia kadrowo-płacowe oraz bezpieczeństwa, więc nie może jechać na
    // uprawnieniu żadnego pojedynczego modułu. Właściciel ma dostęp zawsze.
    AUDIT_VIEW: 'AUDIT_VIEW',
} as const;

export type PermissionCode = keyof typeof PERMISSIONS;

/**
 * A requirement expressed as a single code or an ANY-OF list
 * (the user needs at least one of the listed permissions).
 */
export type PermissionRequirement = PermissionCode | PermissionCode[];

/**
 * A requirement that may additionally be owner-only. No permission code can
 * grant an OWNER_ONLY area: it matches exactly the studio owner
 * (`user.permissions == null`). Used for billing, subscription and
 * company-wide configuration surfaces.
 */
export type AccessRequirement = PermissionRequirement | 'OWNER_ONLY';

/** ANY-OF shorthand: access to the finance area in any capacity. */
export const ANY_FINANCE: PermissionCode[] = [
    'FINANCE_INVOICES',
    'FINANCE_MANAGE_CASH_REGISTER',
    'FINANCE_VIEW_REPORTS',
];

/**
 * ANY-OF shorthand: the Settings view. A user sees Settings when at least one
 * administration area inside it is permitted (owners always pass). Tabs are
 * additionally filtered one by one inside SettingsView.
 */
export const ANY_SETTINGS: PermissionCode[] = [
    'EMPLOYEES_MANAGE',
    'COMMUNICATION_SEND',
    'VISITS_CREATE',
];

/**
 * ANY-OF shorthand: the Dashboard. The dashboard shows cross-module statistics
 * and quick-actions that are only meaningful when the user has access to at
 * least one area beyond the bare calendar view. A user whose sole permission
 * is VISITS_VIEW is redirected to /calendar instead (their default route).
 * Studio owners (null permissions) always pass this check.
 */
export const ANY_DASHBOARD: PermissionCode[] = [
    'CUSTOMERS_VIEW',
    'FINANCE_INVOICES',
    'FINANCE_MANAGE_CASH_REGISTER',
    'FINANCE_VIEW_REPORTS',
    'STATISTICS_VIEW',
    'EMPLOYEES_MANAGE',
    'EMPLOYEES_PAYROLL',
    'MARKETING_MANAGE',
    'LEADS_MANAGE',
    'TASKS_VIEW',
    'COMMUNICATION_SEND',
];
