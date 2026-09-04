import { describe, it, expect } from 'vitest';
import { companyInitials } from './companyBadge';

describe('companyInitials', () => {
    it('pomija formę prawną - inicjały biorą się z nazwy właściwej', () => {
        expect(companyInitials('CARSLAB SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ')).toBe('CA');
        expect(companyInitials('Auto Detailing Sp. z o.o.')).toBe('AD');
    });

    it('nazwa jednowyrazowa daje dwie pierwsze litery', () => {
        expect(companyInitials('Carslab')).toBe('CA');
    });

    it('bierze dwa pierwsze znaczące słowa', () => {
        expect(companyInitials('Studio Detailingu Maciej Sienkiewicz')).toBe('SD');
    });

    it('wraca do wartości domyślnej, gdy nazwy nie ma albo jest sama forma prawna', () => {
        expect(companyInitials(null)).toBe('AC');
        expect(companyInitials('   ')).toBe('AC');
        expect(companyInitials('Spółka z o.o.')).toBe('AC');
    });

    it('ignoruje znaki interpunkcyjne w nazwie jednowyrazowej', () => {
        expect(companyInitials('"Carslab"')).toBe('CA');
    });
});
