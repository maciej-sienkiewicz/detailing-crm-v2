import { describe, expect, it } from 'vitest';
import type { PermissionModuleTree, PermissionTreeNode } from '../../rbacTypes';
import { buildTreeIndex, featureLockedCodes, getBlocker, orderedCodes, toggleCode, toggleModuleCodes } from './permissionGraph';

const node = (code: string, children: PermissionTreeNode[] = [], implies: string[] = []): PermissionTreeNode => ({
    code, displayName: code, description: null, section: null, featureKey: null, implies, children,
});

// VISITS_VIEW → VISITS_MANAGE → VISITS_DELETE; VISITS_MANAGE wymaga też CUSTOMERS_MANAGE (inny moduł).
const catalog: PermissionModuleTree[] = [
    {
        module: 'VISITS', displayName: 'Wizyty', featureKey: null,
        nodes: [node('VISITS_VIEW', [node('VISITS_MANAGE', [node('VISITS_DELETE')], ['CUSTOMERS_MANAGE'])])],
    },
    {
        module: 'LEADS', displayName: 'Leady', featureKey: null,
        nodes: [node('CUSTOMERS_VIEW', [node('CUSTOMERS_MANAGE')])],
    },
];
const index = buildTreeIndex(catalog);

describe('graf zależności uprawnień', () => {
    it('kolejność kodów to kolejność modułów i drzewa', () => {
        expect(orderedCodes(catalog, index)).toEqual([
            'VISITS_VIEW', 'VISITS_MANAGE', 'VISITS_DELETE', 'CUSTOMERS_VIEW', 'CUSTOMERS_MANAGE',
        ]);
    });

    it('uprawnienie jest zablokowane, dopóki nie ma rodzica ani tego, co implikuje', () => {
        expect(getBlocker('VISITS_MANAGE', new Set(), index)).toBe('VISITS_VIEW');
        expect(getBlocker('VISITS_MANAGE', new Set(['VISITS_VIEW']), index)).toBe('CUSTOMERS_MANAGE');
        expect(getBlocker('VISITS_MANAGE', new Set(['VISITS_VIEW', 'CUSTOMERS_MANAGE']), index)).toBeNull();
    });

    it('odznaczenie zabiera wszystko, co od uprawnienia zależy - także w innym module', () => {
        const all = new Set(orderedCodes(catalog, index));

        const withoutCustomers = toggleCode(all, 'CUSTOMERS_MANAGE', index);

        expect(withoutCustomers.has('VISITS_MANAGE')).toBe(false);
        expect(withoutCustomers.has('VISITS_DELETE')).toBe(false);
        expect(withoutCustomers.has('VISITS_VIEW')).toBe(true);
    });

    it('zaznaczenie dodaje tylko to jedno uprawnienie', () => {
        expect([...toggleCode(new Set(['VISITS_VIEW']), 'CUSTOMERS_VIEW', index)].sort()).toEqual(['CUSTOMERS_VIEW', 'VISITS_VIEW']);
    });

    it('nagłówek modułu włącza wszystko, czego warunki są spełnione, a przy komplecie wyłącza całość', () => {
        const codes = index.moduleCodes.get('LEADS')!;

        const on = toggleModuleCodes(new Set(), codes, index);
        expect([...on].sort()).toEqual(['CUSTOMERS_MANAGE', 'CUSTOMERS_VIEW']);

        const visits = index.moduleCodes.get('VISITS')!;
        const visitsOn = toggleModuleCodes(new Set(), visits, index);
        // VISITS_MANAGE czeka na CUSTOMERS_MANAGE z innego modułu - nie włącza się samo.
        expect([...visitsOn]).toEqual(['VISITS_VIEW']);

        const off = toggleModuleCodes(new Set([...on, 'VISITS_VIEW', 'VISITS_MANAGE']), codes, index);
        expect([...off]).toEqual(['VISITS_VIEW']);
    });

    it('nagłówek modułu nie włącza uprawnień zablokowanych brakiem wykupionego modułu', () => {
        const gated: PermissionModuleTree = {
            module: 'LEADS', displayName: 'Leady', featureKey: null,
            nodes: [{ ...node('CUSTOMERS_VIEW', [{ ...node('CUSTOMERS_MANAGE'), featureKey: 'CRM_PRO' }]) }],
        };
        const locked = featureLockedCodes(gated, key => key !== 'CRM_PRO');
        expect([...locked]).toEqual(['CUSTOMERS_MANAGE']);

        const codes = index.moduleCodes.get('LEADS')!;
        const on = toggleModuleCodes(new Set(), codes, index, c => !locked.has(c));
        expect([...on]).toEqual(['CUSTOMERS_VIEW']);

        // Komplet to komplet tego, co da się zaznaczyć - drugie kliknięcie wyłącza moduł.
        const off = toggleModuleCodes(on, codes, index, c => !locked.has(c));
        expect([...off]).toEqual([]);
    });

    it('brak modułu nadrzędnego blokuje całe jego drzewo', () => {
        const gated: PermissionModuleTree = { ...catalog[0], featureKey: 'VISITS_PRO' };
        expect(featureLockedCodes(gated, key => key !== 'VISITS_PRO').size).toBe(3);
    });
});
