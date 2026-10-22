import { describe, it, expect } from 'vitest';
import { companyDisplayName } from './companyBadge';

describe('companyDisplayName', () => {
    it('zdejmuje formę prawną z końca nazwy', () => {
        expect(companyDisplayName('Detailing Studio sp. z o.o.')).toBe('Detailing Studio');
        expect(companyDisplayName('Detailing Studio Sp. z o. o.')).toBe('Detailing Studio');
        expect(companyDisplayName('CARSLAB SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ')).toBe('Carslab');
        expect(companyDisplayName('Auto Blask S.A.')).toBe('Auto Blask');
        expect(companyDisplayName('Kowalski i Syn sp.j.')).toBe('Kowalski i Syn');
        expect(companyDisplayName('Detal, s.c.')).toBe('Detal');
    });

    it('nie rusza nazw bez formy prawnej ani słów, które tylko ją przypominają', () => {
        expect(companyDisplayName('Studio Detailingu Maciej Sienkiewicz')).toBe('Studio Detailingu Maciej Sienkiewicz');
        expect(companyDisplayName('Mycie Spa')).toBe('Mycie Spa');
        expect(companyDisplayName('Detailing Plus')).toBe('Detailing Plus');
    });

    it('sama forma prawna zostaje, zamiast pustego nagłówka', () => {
        expect(companyDisplayName('Spółka z o.o.')).toBe('Spółka z o.o.');
    });
});

describe('companyDisplayName - wersaliki z rejestru', () => {
    it('zamienia nazwę pisaną wersalikami na zwykły zapis', () => {
        expect(companyDisplayName('LEATHER MASTER HUBERT NOWAK')).toBe('Leather Master Hubert Nowak');
        expect(companyDisplayName('AUTO SPA ŁÓDŹ SP. Z O.O.')).toBe('Auto Spa Łódź');
    });

    it('skróty bez samogłosek zostają, spójniki idą małą literą', () => {
        expect(companyDisplayName('DETAILING BMW I PPF')).toBe('Detailing BMW i PPF');
    });

    it('nazwy zapisanej przez studio po swojemu nie rusza', () => {
        expect(companyDisplayName('LeatherMaster')).toBe('LeatherMaster');
        expect(companyDisplayName('GT Detailing')).toBe('GT Detailing');
    });
});
