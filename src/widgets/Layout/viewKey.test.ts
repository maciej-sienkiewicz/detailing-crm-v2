import { describe, expect, it } from 'vitest';
import { viewKeyOf } from './viewKey';

describe('viewKeyOf', () => {
    it('zakładki Pracowników to jeden widok - przełączenie nie gasi nagłówka', () => {
        const keys = ['/employees', '/employees/leave-requests', '/employees/absences', '/employees/worktime']
            .map(viewKeyOf);
        expect(new Set(keys).size).toBe(1);
    });

    it('karta pracownika to inny widok niż lista', () => {
        expect(viewKeyOf('/employees/3f1c9a4e-0000-4000-8000-000000000000')).not.toBe(viewKeyOf('/employees'));
    });

    it('ukośnik na końcu nie robi nowego widoku', () => {
        expect(viewKeyOf('/employees/absences/')).toBe(viewKeyOf('/employees/absences'));
    });

    it('pozostałe trasy są kluczowane samą ścieżką', () => {
        expect(viewKeyOf('/statistics/costs')).toBe('/statistics/costs');
        expect(viewKeyOf('/')).toBe('/');
    });
});
