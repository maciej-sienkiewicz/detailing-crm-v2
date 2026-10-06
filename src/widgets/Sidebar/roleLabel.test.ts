import { describe, expect, it } from 'vitest';
import { getRoleLabel } from './roleLabel';

describe('getRoleLabel', () => {
    it('„USER" z backendu to pracownik, nie surowy kod na ekranie', () => {
        expect(getRoleLabel('USER')).toBe('Pracownik');
        expect(getRoleLabel('OWNER')).toBe('Właściciel');
    });

    it('nieznany kod nie trafia na ekran wprost', () => {
        expect(getRoleLabel('SOMETHING_NEW')).toBe('Pracownik');
    });
});
