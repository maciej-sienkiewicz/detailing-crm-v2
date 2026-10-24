// Nazwa nadawcy SMS: operator przyjmuje tylko litery bez ogonków, cyfry, spację, kropkę
// i myślnik. Polskie litery wcześniej znikały („Błysk Auto!" → „Bysk Auto"), więc studio
// zapisywało nazwę z literówką, nie wiedząc o tym.
import { describe, expect, it } from 'vitest';
import { sanitizeSenderName } from './senderName';

describe('sanitizeSenderName', () => {
    it('zamienia polskie litery na litery bez ogonków, zamiast je wycinać', () => {
        expect(sanitizeSenderName('Błysk Auto!')).toBe('Blysk Auto');
        expect(sanitizeSenderName('ŻÓŁĆ Ęą')).toBe('ZOLC Ea');
    });

    it('zostawia wielkość liter, cyfry, spację, kropkę i myślnik', () => {
        expect(sanitizeSenderName('Detail-Boost.24')).toBe('Detail-Boost.24');
    });

    it('usuwa znaki, których operator nie przyjmie', () => {
        expect(sanitizeSenderName('Auto&Spa_#1')).toBe('AutoSpa1');
    });
});
