import { describe, expect, it } from 'vitest';
import type { User } from '@/modules/auth/types';
import { getDefaultRoute, hasPermission } from './helpers';

const makeUser = (overrides: Partial<User>): User => ({
    userId: 'u1',
    studioId: 's1',
    email: 'user@example.com',
    role: 'employee',
    subscriptionStatus: 'ACTIVE',
    trialDaysRemaining: 0,
    ...overrides,
});

const owner = makeUser({ permissions: null });
const employee = (...permissions: string[]) => makeUser({ permissions });

describe('hasPermission', () => {
    it('denies everything without a user', () => {
        expect(hasPermission(null, 'VISITS_VIEW')).toBe(false);
        expect(hasPermission(null, 'OWNER_ONLY')).toBe(false);
    });

    it('grants everything to the owner (permissions == null)', () => {
        expect(hasPermission(owner, 'EMPLOYEES_PAYROLL')).toBe(true);
        expect(hasPermission(owner, ['FINANCE_INVOICES', 'STATISTICS_VIEW'])).toBe(true);
    });

    it('checks a single code against the granted set', () => {
        const user = employee('VISITS_VIEW', 'TASKS_VIEW');
        expect(hasPermission(user, 'VISITS_VIEW')).toBe(true);
        expect(hasPermission(user, 'VISITS_CREATE')).toBe(false);
    });

    it('treats an array as ANY-OF', () => {
        const user = employee('STATISTICS_VIEW');
        expect(hasPermission(user, ['FINANCE_VIEW_REPORTS', 'STATISTICS_VIEW'])).toBe(true);
        expect(hasPermission(user, ['FINANCE_VIEW_REPORTS', 'FINANCE_INVOICES'])).toBe(false);
    });

    it('OWNER_ONLY matches exactly the owner — no permission code can grant it', () => {
        expect(hasPermission(owner, 'OWNER_ONLY')).toBe(true);
        expect(hasPermission(employee('EMPLOYEES_MANAGE', 'AUDIT_VIEW'), 'OWNER_ONLY')).toBe(false);
        expect(hasPermission(employee(), 'OWNER_ONLY')).toBe(false);
    });
});

describe('getDefaultRoute', () => {
    it('sends the owner to /customers (historical default)', () => {
        expect(getDefaultRoute(owner)).toBe('/customers');
    });

    it('picks the first area the user can access', () => {
        expect(getDefaultRoute(employee('VISITS_VIEW'))).toBe('/calendar');
        expect(getDefaultRoute(employee('LEADS_MANAGE'))).toBe('/leads');
        expect(getDefaultRoute(employee('FINANCE_VIEW_REPORTS'))).toBe('/finances');
        expect(getDefaultRoute(employee('CUSTOMERS_VIEW', 'VISITS_VIEW'))).toBe('/customers');
    });

    it('sends a zero-permission user to the task inbox, never into a redirect loop', () => {
        expect(getDefaultRoute(employee())).toBe('/notifications');
        expect(getDefaultRoute(makeUser({ permissions: [], trackWorkTime: true }))).toBe('/notifications');
        expect(getDefaultRoute(null)).toBe('/notifications');
    });
});
