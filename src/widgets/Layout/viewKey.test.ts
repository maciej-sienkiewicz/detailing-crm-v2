import { describe, expect, it } from 'vitest';
import { viewKeyOf } from './viewKey';

describe('viewKeyOf - zakładki jednego widoku nie odgrywają przebitki', () => {
    it('wszystkie zakładki „Pracowników" mają ten sam klucz', () => {
        const keys = ['/employees', '/employees/leave-requests', '/employees/absences', '/employees/worktime', '/employees/absences/']
            .map(viewKeyOf);
        expect(new Set(keys)).toEqual(new Set(['/employees']));
    });

    it('karta pracownika i inne widoki zostają osobnymi widokami', () => {
        expect(viewKeyOf('/employees/3f2a-uuid')).toBe('/employees/3f2a-uuid');
        expect(viewKeyOf('/customers')).toBe('/customers');
        expect(viewKeyOf('/')).toBe('/');
    });
});
