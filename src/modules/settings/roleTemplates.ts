import type { CreateRoleRequest } from './rbacTypes';

/**
 * Starting points for a role, named the way a detailing studio names its jobs.
 *
 * They exist so "I need a role before I can add this person" stops being a detour:
 * picking a template is one click inside the employee form, and the full permission
 * editor stays available for the studios whose structure doesn't match any of these.
 *
 * Only the meaningful permissions are listed — the backend closes the set over the
 * permission dependency graph, so implied parents don't need spelling out.
 */
export interface RoleTemplate {
    id: string;
    name: string;
    /** One line, in the studio's own terms, shown under the template name. */
    summary: string;
    permissions: string[];
    trackWorkTime: boolean;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
    {
        id: 'detailer',
        name: 'Detailer',
        summary: 'Wykonuje wizyty — bez cen, finansów i ustawień',
        permissions: ['VISITS_VIEW', 'CUSTOMERS_VIEW', 'VISITS_CREATE', 'TASKS_VIEW'],
        trackWorkTime: true,
    },
    {
        id: 'reception',
        name: 'Recepcja',
        summary: 'Umawia wizyty, obsługuje klientów i wysyła wiadomości',
        permissions: [
            'VISITS_VIEW', 'CUSTOMERS_VIEW', 'VISITS_CREATE',
            'VISITS_SERVICE_PRICES_VIEW', 'COMMUNICATION_SEND', 'LEADS_MANAGE', 'TASKS_VIEW',
        ],
        trackWorkTime: true,
    },
    {
        id: 'manager',
        name: 'Menedżer',
        summary: 'Prowadzi studio — zespół, raporty i marketing',
        permissions: [
            'VISITS_VIEW', 'CUSTOMERS_VIEW', 'VISITS_CREATE', 'VISITS_SERVICE_PRICES_VIEW',
            'BATCH_ORDERS', 'COMMUNICATION_SEND', 'MARKETING_MANAGE',
            'EMPLOYEES_MANAGE', 'FINANCE_VIEW_REPORTS', 'STATISTICS_VIEW', 'TASKS_MANAGE',
        ],
        trackWorkTime: false,
    },
    {
        id: 'viewer',
        name: 'Tylko podgląd',
        summary: 'Widzi wizyty i klientów, niczego nie zmienia',
        permissions: ['VISITS_VIEW', 'CUSTOMERS_VIEW'],
        trackWorkTime: false,
    },
];

export const toCreateRoleRequest = (template: RoleTemplate): CreateRoleRequest => ({
    name: template.name,
    description: template.summary,
    permissions: template.permissions,
    trackWorkTime: template.trackWorkTime,
});
