// ─── Permission catalog (frontend mirror) ───────────────────────────────────
// Mirrors the backend enum `pl.detailing.crm.role.domain.Permission`.
// The backend is the source of truth: it computes the user's EFFECTIVE
// permission set (tree closure + cross-module expansion + feature gating)
// and returns it from GET /api/v1/auth/me as `user.permissions`.
// `null` permissions = studio owner = unrestricted access.

export const PERMISSIONS = {
    // Wizyty i kalendarz
    VISITS_VIEW: 'VISITS_VIEW',
    VISITS_CREATE: 'VISITS_CREATE',
    VISITS_CHANGE_STATUS: 'VISITS_CHANGE_STATUS',
    VISITS_DELETE: 'VISITS_DELETE',
    VISITS_SERVICE_PRICES_VIEW: 'VISITS_SERVICE_PRICES_VIEW',
    VISITS_SERVICE_PRICES_EDIT: 'VISITS_SERVICE_PRICES_EDIT',
    VISITS_MEDIA_DELETE: 'VISITS_MEDIA_DELETE',
    VISITS_DOCUMENTS_MANAGE: 'VISITS_DOCUMENTS_MANAGE',
    // Klienci i pojazdy
    CUSTOMERS_VIEW: 'CUSTOMERS_VIEW',
    CUSTOMERS_MANAGE: 'CUSTOMERS_MANAGE',
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
    // Statystyki
    STATISTICS_VIEW: 'STATISTICS_VIEW',
    // Leady
    LEADS_MANAGE: 'LEADS_MANAGE',
    // Zadania
    TASKS_VIEW: 'TASKS_VIEW',
    TASKS_MANAGE: 'TASKS_MANAGE',
    // Usługi (cennik)
    SERVICES_VIEW: 'SERVICES_VIEW',
    SERVICES_MANAGE: 'SERVICES_MANAGE',
} as const;

export type PermissionCode = keyof typeof PERMISSIONS;

/**
 * A requirement expressed as a single code or an ANY-OF list
 * (the user needs at least one of the listed permissions).
 */
export type PermissionRequirement = PermissionCode | PermissionCode[];

/** ANY-OF shorthand: access to the finance area in any capacity. */
export const ANY_FINANCE: PermissionCode[] = [
    'FINANCE_INVOICES',
    'FINANCE_MANAGE_CASH_REGISTER',
    'FINANCE_VIEW_REPORTS',
];
