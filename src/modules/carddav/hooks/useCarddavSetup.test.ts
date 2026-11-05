// Audyt 05.11: telefon z kontaktami klientów dodany kodem QR z komputera stał na liście
// jako „Mac, Chrome” - nazwa opisywała komputer, który kliknął, a nie iPhone'a.
import { describe, expect, it } from 'vitest';
import { carddavDeviceName } from './useCarddavSetup';

describe('carddavDeviceName', () => {
    it('z komputera albo Androida: iPhone, bo profil instaluje się tylko na nim', () => {
        expect(carddavDeviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36')).toBe('iPhone');
        expect(carddavDeviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0')).toBe('iPhone');
    });
});
