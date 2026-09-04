// src/modules/visits/components/handover/signatureStep.test.ts

import { describe, it, expect } from 'vitest';
import { advanceLabel, allProtocolsSigned } from './signatureStep';

describe('allProtocolsSigned', () => {
    it('wymaga podpisu pod KAŻDYM dokumentem wydania', () => {
        expect(allProtocolsSigned({ total: 2, signed: 1 })).toBe(false);
        expect(allProtocolsSigned({ total: 2, signed: 2 })).toBe(true);
    });

    it('brak dokumentu to nie to samo co zebrany podpis', () => {
        // Ta wartość jedzie do backendu jako signatureObtained. Studio, które nie
        // skonfigurowało dokumentu wydania, nie zebrało podpisu - nie ma pod czym.
        expect(allProtocolsSigned({ total: 0, signed: 0 })).toBe(false);
    });
});

describe('advanceLabel', () => {
    it('nazywa pominięcie po imieniu, gdy dokument czeka na podpis', () => {
        expect(advanceLabel({ total: 1, signed: 0 })).toBe('Pomiń podpis i przejdź do płatności');
    });

    it('po zebraniu wszystkich podpisów to zwykłe przejście dalej', () => {
        expect(advanceLabel({ total: 2, signed: 2 })).toBe('Przejdź do płatności');
    });

    it('bez dokumentu wydania nie ma czego pomijać', () => {
        // Krok podpisu nie może stać się ślepą uliczką dla studia bez dokumentu,
        // ale też nie ma go straszyć pomijaniem czegoś, czego nie ma.
        expect(advanceLabel({ total: 0, signed: 0 })).toBe('Przejdź do płatności');
    });
});
