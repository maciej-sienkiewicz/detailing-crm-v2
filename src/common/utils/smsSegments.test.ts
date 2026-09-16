import { describe, expect, it } from 'vitest';
import { hasPolishCharacters, smsSegments, smsWord } from './smsSegments';

describe('smsSegments', () => {
    it('160 znaków bez ogonków mieści się w jednym segmencie, 161 już nie', () => {
        expect(smsSegments(160, false)).toBe(1);
        expect(smsSegments(161, false)).toBe(2);
    });

    it('jeden ogonek tnie segment ze 160 znaków do 70', () => {
        // To jest cała treść podpowiedzi „nie używaj polskich znaków": ta sama
        // wiadomość kosztuje wtedy wielokrotnie więcej.
        expect(smsSegments(100, false)).toBe(1);
        expect(smsSegments(100, true)).toBe(2);
    });

    it('dzielona wiadomość liczy się po krótszym segmencie', () => {
        // Powyżej jednego segmentu operator dokłada nagłówek łączący, więc na treść
        // zostaje 153 znaki (GSM-7) albo 67 (UCS-2).
        expect(smsSegments(306, false)).toBe(2);
        expect(smsSegments(307, false)).toBe(3);
        expect(smsSegments(134, true)).toBe(2);
        expect(smsSegments(135, true)).toBe(3);
    });

    it('pusty tekst to zero segmentów, chyba że wywołujący prosi inaczej', () => {
        // Licznik „ile zapłacę" chce 0 (nic nie wysyłamy), podgląd gotowej treści
        // chce 1 (tyle wyjdzie, gdy cokolwiek wpiszesz).
        expect(smsSegments(0, false)).toBe(0);
        expect(smsSegments(0, false, false)).toBe(1);
    });
});

describe('hasPolishCharacters', () => {
    it.each(['zażółć', 'Świeży', 'łąka', 'ĘĄ'])('wykrywa ogonki w %s', text => {
        expect(hasPolishCharacters(text)).toBe(true);
    });

    it('czysty ASCII nie przelacza kodowania', () => {
        expect(hasPolishCharacters('Zazolc gesla jazn')).toBe(false);
    });
});

describe('smsWord', () => {
    it.each([
        [1, 'SMS'],
        [2, 'SMS-y'],
        [4, 'SMS-y'],
        [5, 'SMS-ów'],
        [12, 'SMS-ów'],
        [22, 'SMS-y'],
        [25, 'SMS-ów'],
    ])('%i → %s', (count, expected) => {
        expect(smsWord(count)).toBe(expected);
    });
});
