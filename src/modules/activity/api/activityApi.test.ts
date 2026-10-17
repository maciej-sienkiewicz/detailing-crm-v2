import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_ACTIVITY_FILTERS, whoForEmployee } from '../types';
import { buildFeedParams } from './activityApi';

vi.mock('@/core', () => ({ apiClient: { get: vi.fn() } }));

describe('buildFeedParams', () => {
    it('domyślnie pyta o wszystko bez rutynowych wiadomości automatu', () => {
        expect(buildFeedParams(DEFAULT_ACTIVITY_FILTERS, null, 30)).toEqual({ limit: 30, hideAutomated: true });
    });

    it('obszar idzie jako `areas`, a pracownik jako id i typ aktora', () => {
        const params = buildFeedParams({
            ...DEFAULT_ACTIVITY_FILTERS,
            area: 'MONEY',
            who: whoForEmployee('user-42'),
            hideAutomated: false,
            search: '  kowalski ',
        }, 'cursor-1', 30);

        expect(params).toEqual({
            limit: 30,
            cursor: 'cursor-1',
            areas: 'MONEY',
            actorId: 'user-42',
            actorTypes: 'EMPLOYEE',
            search: 'kowalski',
        });
    });

    it('„Klienci" i „Automaty" to typy aktora, nie osoby', () => {
        expect(buildFeedParams({ ...DEFAULT_ACTIVITY_FILTERS, who: 'CUSTOMERS' }, null, 30).actorTypes).toBe('CUSTOMER');
        expect(buildFeedParams({ ...DEFAULT_ACTIVITY_FILTERS, who: 'AUTOMATIONS' }, null, 30).actorTypes).toBe('SYSTEM,INTEGRATION');
    });
});
