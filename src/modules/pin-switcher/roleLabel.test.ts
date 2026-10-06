import { describe, expect, it } from 'vitest';
import { profileRoleLabel } from './roleLabel';

describe('profileRoleLabel', () => {
    it('pokazuje rolę nadaną przez studio', () => {
        expect(profileRoleLabel({ isOwner: false, roleName: 'Recepcja' })).toBe('Recepcja');
    });

    it('właściciel to właściciel, konto bez roli to pracownik', () => {
        expect(profileRoleLabel({ isOwner: true, roleName: null })).toBe('Właściciel');
        expect(profileRoleLabel({ isOwner: false, roleName: null })).toBe('Pracownik');
        expect(profileRoleLabel({ isOwner: false })).toBe('Pracownik');
    });
});
